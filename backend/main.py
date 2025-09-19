# main.py
import os
import uuid
import secrets
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import httpx
import asyncio
import jwt

# Load .env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# MongoDB setup
mongo_url = os.environ["MONGO_URL"]
db_name = os.environ["DB_NAME"]
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# JWT
JWT_SECRET = os.environ.get("JWT_SECRET", "kriptonit_secret_key_2025")

# Signaling service
SIGNALING_URL = os.environ.get("SIGNALING_URL", "http://signaling-service:8080")

# Notification service
NOTIFICATION_URL = os.environ.get("NOTIFICATION_URL", "http://notification-service:9000")

# FastAPI setup
app = FastAPI()
api_router = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# ------------------ Models ------------------

class AnonymousUser(BaseModel):
    id: str
    anonymous_id: str
    display_name: str
    created_at: datetime
    last_active: datetime
    is_blocked: bool = False
    device_tokens: List[str] = []  # токены устройств

class AnonymousUserResponse(BaseModel):
    id: str
    anonymous_id: str
    display_name: str
    token: str
    device_tokens: List[str] = []

class AnonymousUserCreate(BaseModel):
    device_token: Optional[str] = None

class Post(BaseModel):
    id: str
    author_id: str
    author_display_name: str
    title: str
    content: str
    images: List[str] = []
    tags: List[str] = []
    created_at: datetime
    updated_at: datetime
    is_blocked: bool = False
    comments_count: int = 0

class PostCreate(BaseModel):
    title: str
    content: str
    images: List[str] = []
    tags: List[str] = []

class Comment(BaseModel):
    id: str
    post_id: str
    author_id: str
    author_display_name: str
    content: str
    created_at: datetime
    is_blocked: bool = False

class CommentCreate(BaseModel):
    content: str

class Report(BaseModel):
    id: str
    reporter_id: str
    target_type: str
    target_id: str
    reason: str
    created_at: datetime

class ReportCreate(BaseModel):
    target_type: str
    target_id: str
    reason: str

class Chat(BaseModel):
    id: str
    participants: List[str]
    created_at: datetime
    last_message_at: datetime
    is_active: bool = True

class Message(BaseModel):
    id: str
    chat_id: str
    sender_id: str
    sender_display_name: str
    content: str
    created_at: datetime
    is_read: bool = False

class MessageCreate(BaseModel):
    content: str

class CallRequest(BaseModel):
    id: str
    chat_id: str
    caller_id: str
    caller_display_name: str
    receiver_id: str
    status: str
    created_at: datetime
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_minutes: int = 0

class CallRequestCreate(BaseModel):
    receiver_id: str

class CallResponse(BaseModel):
    action: str  # accept / reject

class WebRTCOffer(BaseModel):
    chat_id: str
    offer: dict

class WebRTCAnswer(BaseModel):
    chat_id: str
    answer: dict

class ICECandidate(BaseModel):
    chat_id: str
    candidate: dict

class ChatCreate(BaseModel):
    receiver_id: str
    device_token: Optional[str] = None

# ------------------ Helper functions ------------------

def generate_anonymous_id():
    return f"Автор #{secrets.randbelow(9999)+1}"

def generate_jwt_token(user_id: str):
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

async def create_signaling_room(chat_id: str):
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"{SIGNALING_URL}/rooms", json={"chat_id": chat_id})
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to create signaling room for chat {chat_id}: {e}")
            return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("user_id")
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(401, "User not found")
        if user.get("is_blocked"):
            raise HTTPException(403, "User is blocked")
        await db.users.update_one({"id": user_id}, {"$set": {"last_active": datetime.utcnow()}})
        return AnonymousUser(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

async def send_push(user_id: str, token: str, title: str, body: str, platform: str = "firebase"):
    payload = {
        "user_id": user_id,
        "title": title,
        "body": body,
        "platform": platform,
        "token": token,
    }
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"{NOTIFICATION_URL}/push", json=payload, timeout=5)
            resp.raise_for_status()
            logger.info(f"Push queued for {user_id}, token={token}")
        except httpx.HTTPError as e:
            logger.error(f"Push error for {user_id}: {e}")

# ------------------ Auth ------------------

@api_router.post("/auth/anonymous", response_model=AnonymousUserResponse)
async def create_anonymous_user(user_data: AnonymousUserCreate):
    user_id = str(uuid.uuid4())
    anonymous_id = generate_anonymous_id()
    while await db.users.find_one({"anonymous_id": anonymous_id}):
        anonymous_id = generate_anonymous_id()
    display_name = anonymous_id
    device_tokens = [user_data.device_token] if user_data.device_token else []
    user = AnonymousUser(
        id=user_id,
        anonymous_id=anonymous_id,
        display_name=display_name,
        created_at=datetime.utcnow(),
        last_active=datetime.utcnow(),
        is_blocked=False,
        device_tokens=device_tokens
    )
    await db.users.insert_one(user.dict())
    token = generate_jwt_token(user_id)
    return AnonymousUserResponse(
        id=user_id,
        anonymous_id=anonymous_id,
        display_name=display_name,
        token=token,
        device_tokens=device_tokens
    )

@api_router.get("/auth/me", response_model=AnonymousUser)
async def get_me(current_user: AnonymousUser = Depends(get_current_user)):
    return current_user

# ------------------ Posts ------------------

@api_router.post("/posts", response_model=Post)
async def create_post(post_data: PostCreate, current_user: AnonymousUser = Depends(get_current_user)):
    post_id = str(uuid.uuid4())
    post = Post(
        id=post_id,
        author_id=current_user.id,
        author_display_name=current_user.display_name,
        title=post_data.title,
        content=post_data.content,
        images=post_data.images,
        tags=post_data.tags,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    await db.posts.insert_one(post.dict())
    return post

@api_router.get("/posts", response_model=List[Post])
async def get_posts(skip: int = 0, limit: int = 20):
    posts = await db.posts.find({"is_blocked": False}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [Post(**p) for p in posts]

@api_router.get("/posts/{post_id}", response_model=Post)
async def get_post(post_id: str):
    post = await db.posts.find_one({"id": post_id, "is_blocked": False})
    if not post:
        raise HTTPException(404, "Post not found")
    return Post(**post)

# ------------------ Comments ------------------

@api_router.post("/posts/{post_id}/comments", response_model=Comment)
async def add_comment(post_id: str, comment_data: CommentCreate, current_user: AnonymousUser = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id, "is_blocked": False})
    if not post:
        raise HTTPException(404, "Post not found")
    comment_id = str(uuid.uuid4())
    comment = Comment(
        id=comment_id,
        post_id=post_id,
        author_id=current_user.id,
        author_display_name=current_user.display_name,
        content=comment_data.content,
        created_at=datetime.utcnow()
    )
    await db.comments.insert_one(comment.dict())
    await db.posts.update_one({"id": post_id}, {"$inc": {"comments_count": 1}})
    return comment

@api_router.get("/posts/{post_id}/comments", response_model=List[Comment])
async def get_comments(post_id: str):
    comments = await db.comments.find({"post_id": post_id, "is_blocked": False}).sort("created_at", 1).to_list(1000)
    return [Comment(**c) for c in comments]

# ------------------ Reports ------------------

@api_router.post("/reports")
async def create_report(report_data: ReportCreate, current_user: AnonymousUser = Depends(get_current_user)):
    report_id = str(uuid.uuid4())
    report = Report(
        id=report_id,
        reporter_id=current_user.id,
        target_type=report_data.target_type,
        target_id=report_data.target_id,
        reason=report_data.reason,
        created_at=datetime.utcnow()
    )
    await db.reports.insert_one(report.dict())
    return {"message": "Report submitted successfully"}

# ------------------ Chats & Messages ------------------

@api_router.post("/chats")
async def create_chat(chat_data: ChatCreate, current_user: AnonymousUser = Depends(get_current_user)):
    existing_chat = await db.chats.find_one({"participants": {"$all": [current_user.id, chat_data.receiver_id]}, "is_active": True})
    if existing_chat:
        return Chat(**existing_chat)

    chat_id = str(uuid.uuid4())
    chat = Chat(
        id=chat_id,
        participants=[current_user.id, chat_data.receiver_id],
        created_at=datetime.utcnow(),
        last_message_at=datetime.utcnow()
    )
    await db.chats.insert_one(chat.dict())
    asyncio.create_task(create_signaling_room(chat_id))

    # пуш на создание чата
    tokens = chat_data.device_token and [chat_data.device_token] or current_user.device_tokens
    for token in tokens:
        asyncio.create_task(send_push(
            user_id=current_user.id,
            token=token,
            title="Новый чат",
            body=f"Чат с {current_user.display_name} создан"
        ))

    return chat

@api_router.get("/chats", response_model=List[Chat])
async def get_user_chats(current_user: AnonymousUser = Depends(get_current_user)):
    chats = await db.chats.find({"participants": current_user.id, "is_active": True}).sort("last_message_at", -1).to_list(100)
    return [Chat(**c) for c in chats]

@api_router.post("/chats/{chat_id}/messages", response_model=Message)
async def send_message(chat_id: str, message_data: MessageCreate, current_user: AnonymousUser = Depends(get_current_user)):
    chat = await db.chats.find_one({"id": chat_id, "participants": current_user.id})
    if not chat:
        raise HTTPException(404, "Chat not found")
    message_id = str(uuid.uuid4())
    message = Message(
        id=message_id,
        chat_id=chat_id,
        sender_id=current_user.id,
        sender_display_name=current_user.display_name,
        content=message_data.content,
        created_at=datetime.utcnow()
    )
    await db.messages.insert_one(message.dict())
    await db.chats.update_one({"id": chat_id}, {"$set": {"last_message_at": datetime.utcnow()}})
    return message

@api_router.get("/chats/{chat_id}/messages", response_model=List[Message])
async def get_chat_messages(chat_id: str, current_user: AnonymousUser = Depends(get_current_user)):
    chat = await db.chats.find_one({"id": chat_id, "participants": current_user.id})
    if not chat:
        raise HTTPException(404, "Chat not found")
    messages = await db.messages.find({"chat_id": chat_id}).sort("created_at", 1).to_list(1000)
    return [Message(**m) for m in messages]

# ------------------ Call start ------------------

async def handle_call_start(user: AnonymousUser):
    for token in user.device_tokens:
        asyncio.create_task(send_push(
            user_id=user.id,
            token=token,
            title="Входящий звонок",
            body="Вам звонят 🚀"
        ))

# ------------------ Health ------------------

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "kriptonit-backend"}

# ------------------ Include router ------------------

app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
