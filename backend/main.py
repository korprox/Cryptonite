from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
import hashlib
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'kriptonit_secret_key_2025')

# Models
class AnonymousUser(BaseModel):
    id: str
    anonymous_id: str
    display_name: str
    created_at: datetime
    last_active: datetime
    is_blocked: bool = False

class AnonymousUserCreate(BaseModel):
    pass  # No input needed - completely anonymous

class AnonymousUserResponse(BaseModel):
    id: str
    anonymous_id: str
    display_name: str
    token: str

class Post(BaseModel):
    id: str
    author_id: str
    author_display_name: str
    title: str
    content: str
    images: List[str] = []  # base64 encoded images
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
    target_type: str  # "post" or "comment"
    target_id: str
    reason: str
    created_at: datetime

class ReportCreate(BaseModel):
    target_type: str
    target_id: str
    reason: str

class Chat(BaseModel):
    id: str
    participants: List[str]  # user IDs
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
    status: str  # "pending", "accepted", "rejected", "ended"
    created_at: datetime
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_minutes: int = 0

class CallRequestCreate(BaseModel):
    receiver_id: str

class CallResponse(BaseModel):
    action: str  # "accept" or "reject"

class WebRTCOffer(BaseModel):
    chat_id: str
    offer: dict

class WebRTCAnswer(BaseModel):
    chat_id: str
    answer: dict

class ICECandidate(BaseModel):
    chat_id: str
    candidate: dict

# Helper functions
def generate_anonymous_id():
    """Generate anonymous ID like 'Автор #1472'"""
    number = secrets.randbelow(9999) + 1
    return f"Автор #{number}"

def generate_jwt_token(user_id: str):
    """Generate JWT token for user"""
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("user_id")
        
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        if user.get("is_blocked", False):
            raise HTTPException(status_code=403, detail="User is blocked")
            
        # Update last active
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"last_active": datetime.utcnow()}}
        )
        
        return AnonymousUser(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Routes

@api_router.post("/auth/anonymous", response_model=AnonymousUserResponse)
async def create_anonymous_user():
    """Create anonymous user - no registration needed"""
    user_id = str(uuid.uuid4())
    anonymous_id = generate_anonymous_id()
    
    # Check if anonymous_id already exists, regenerate if needed
    while await db.users.find_one({"anonymous_id": anonymous_id}):
        anonymous_id = generate_anonymous_id()
    
    display_name = anonymous_id
    
    user = AnonymousUser(
        id=user_id,
        anonymous_id=anonymous_id,
        display_name=display_name,
        created_at=datetime.utcnow(),
        last_active=datetime.utcnow(),
        is_blocked=False
    )
    
    await db.users.insert_one(user.dict())
    
    token = generate_jwt_token(user_id)
    
    return AnonymousUserResponse(
        id=user_id,
        anonymous_id=anonymous_id,
        display_name=display_name,
        token=token
    )

@api_router.get("/auth/me", response_model=AnonymousUser)
async def get_current_user_info(current_user: AnonymousUser = Depends(get_current_user)):
    """Get current user info"""
    return current_user

@api_router.post("/posts", response_model=Post)
async def create_post(post_data: PostCreate, current_user: AnonymousUser = Depends(get_current_user)):
    """Create a new post"""
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
        is_blocked=False,
        comments_count=0
    )
    
    await db.posts.insert_one(post.dict())
    return post

@api_router.get("/posts", response_model=List[Post])
async def get_posts(skip: int = 0, limit: int = 20):
    """Get posts (public endpoint)"""
    posts = await db.posts.find(
        {"is_blocked": False}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return [Post(**post) for post in posts]

@api_router.get("/posts/{post_id}", response_model=Post)
async def get_post(post_id: str):
    """Get single post"""
    post = await db.posts.find_one({"id": post_id, "is_blocked": False})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return Post(**post)

@api_router.post("/posts/{post_id}/comments", response_model=Comment)
async def add_comment(post_id: str, comment_data: CommentCreate, current_user: AnonymousUser = Depends(get_current_user)):
    """Add comment to post"""
    # Check if post exists
    post = await db.posts.find_one({"id": post_id, "is_blocked": False})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comment_id = str(uuid.uuid4())
    
    comment = Comment(
        id=comment_id,
        post_id=post_id,
        author_id=current_user.id,
        author_display_name=current_user.display_name,
        content=comment_data.content,
        created_at=datetime.utcnow(),
        is_blocked=False
    )
    
    await db.comments.insert_one(comment.dict())
    
    # Update comments count
    await db.posts.update_one(
        {"id": post_id},
        {"$inc": {"comments_count": 1}}
    )
    
    return comment

@api_router.get("/posts/{post_id}/comments", response_model=List[Comment])
async def get_comments(post_id: str):
    """Get comments for post"""
    comments = await db.comments.find(
        {"post_id": post_id, "is_blocked": False}
    ).sort("created_at", 1).to_list(1000)
    
    return [Comment(**comment) for comment in comments]

@api_router.post("/reports")
async def create_report(report_data: ReportCreate, current_user: AnonymousUser = Depends(get_current_user)):
    """Report content"""
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

class ChatCreate(BaseModel):
    receiver_id: str

# Chat endpoints
@api_router.post("/chats")
async def create_chat(chat_data: ChatCreate, current_user: AnonymousUser = Depends(get_current_user)):
    """Create or get existing chat with another user"""
    # Check if chat already exists
    existing_chat = await db.chats.find_one({
        "participants": {"$all": [current_user.id, chat_data.receiver_id]},
        "is_active": True
    })
    
    if existing_chat:
        return Chat(**existing_chat)
    
    # Create new chat
    chat_id = str(uuid.uuid4())
    chat = Chat(
        id=chat_id,
        participants=[current_user.id, chat_data.receiver_id],
        created_at=datetime.utcnow(),
        last_message_at=datetime.utcnow(),
        is_active=True
    )
    
    await db.chats.insert_one(chat.dict())
    return chat

@api_router.get("/chats", response_model=List[Chat])
async def get_user_chats(current_user: AnonymousUser = Depends(get_current_user)):
    """Get all chats for current user"""
    chats = await db.chats.find({
        "participants": current_user.id,
        "is_active": True
    }).sort("last_message_at", -1).to_list(100)
    
    return [Chat(**chat) for chat in chats]

@api_router.post("/chats/{chat_id}/messages", response_model=Message)
async def send_message(chat_id: str, message_data: MessageCreate, current_user: AnonymousUser = Depends(get_current_user)):
    """Send message in chat"""
    # Verify user is participant
    chat = await db.chats.find_one({"id": chat_id, "participants": current_user.id})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    message_id = str(uuid.uuid4())
    message = Message(
        id=message_id,
        chat_id=chat_id,
        sender_id=current_user.id,
        sender_display_name=current_user.display_name,
        content=message_data.content,
        created_at=datetime.utcnow(),
        is_read=False
    )
    
    await db.messages.insert_one(message.dict())
    
    # Update chat last message time
    await db.chats.update_one(
        {"id": chat_id},
        {"$set": {"last_message_at": datetime.utcnow()}}
    )
    
    return message

@api_router.get("/chats/{chat_id}/messages", response_model=List[Message])
async def get_chat_messages(chat_id: str, current_user: AnonymousUser = Depends(get_current_user)):
    """Get messages in chat"""
    # Verify user is participant
    chat = await db.chats.find_one({"id": chat_id, "participants": current_user.id})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    messages = await db.messages.find(
        {"chat_id": chat_id}
    ).sort("created_at", 1).to_list(1000)
    
    return [Message(**message) for message in messages]

# Call endpoints
@api_router.post("/chats/{chat_id}/call-request", response_model=CallRequest)
async def create_call_request(chat_id: str, current_user: AnonymousUser = Depends(get_current_user)):
    """Request audio call with chat participant"""
    # Verify chat exists and user is participant
    chat = await db.chats.find_one({"id": chat_id, "participants": current_user.id})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Get receiver ID (other participant)
    receiver_id = None
    for participant_id in chat["participants"]:
        if participant_id != current_user.id:
            receiver_id = participant_id
            break
    
    if not receiver_id:
        raise HTTPException(status_code=400, detail="No other participant found")
    
    # Check for existing pending call
    existing_call = await db.call_requests.find_one({
        "chat_id": chat_id,
        "status": "pending"
    })
    
    if existing_call:
        raise HTTPException(status_code=400, detail="Call already in progress")
    
    call_id = str(uuid.uuid4())
    call_request = CallRequest(
        id=call_id,
        chat_id=chat_id,
        caller_id=current_user.id,
        caller_display_name=current_user.display_name,
        receiver_id=receiver_id,
        status="pending",
        created_at=datetime.utcnow(),
        duration_minutes=0
    )
    
    await db.call_requests.insert_one(call_request.dict())
    return call_request

@api_router.post("/call-requests/{call_id}/respond")
async def respond_to_call(call_id: str, response: CallResponse, current_user: AnonymousUser = Depends(get_current_user)):
    """Accept or reject call request"""
    call_request = await db.call_requests.find_one({
        "id": call_id,
        "receiver_id": current_user.id,
        "status": "pending"
    })
    
    if not call_request:
        raise HTTPException(status_code=404, detail="Call request not found")
    
    new_status = "accepted" if response.action == "accept" else "rejected"
    update_data = {"status": new_status}
    
    if response.action == "accept":
        update_data["started_at"] = datetime.utcnow()
    
    await db.call_requests.update_one(
        {"id": call_id},
        {"$set": update_data}
    )
    
    return {"message": f"Call {new_status}"}

@api_router.post("/call-requests/{call_id}/end")
async def end_call(call_id: str, current_user: AnonymousUser = Depends(get_current_user)):
    """End active call"""
    call_request = await db.call_requests.find_one({
        "id": call_id,
        "$or": [{"caller_id": current_user.id}, {"receiver_id": current_user.id}],
        "status": "accepted"
    })
    
    if not call_request:
        raise HTTPException(status_code=404, detail="Active call not found")
    
    ended_at = datetime.utcnow()
    started_at = call_request.get("started_at")
    duration = 0
    
    if started_at:
        duration = int((ended_at - started_at).total_seconds() / 60)
    
    await db.call_requests.update_one(
        {"id": call_id},
        {"$set": {
            "status": "ended",
            "ended_at": ended_at,
            "duration_minutes": duration
        }}
    )
    
    return {"message": "Call ended", "duration_minutes": duration}

# WebRTC signaling endpoints
@api_router.post("/webrtc/offer")
async def send_webrtc_offer(offer_data: WebRTCOffer, current_user: AnonymousUser = Depends(get_current_user)):
    """Send WebRTC offer for call setup"""
    # Store offer in temporary collection for receiver to get
    await db.webrtc_offers.insert_one({
        "chat_id": offer_data.chat_id,
        "caller_id": current_user.id,
        "offer": offer_data.offer,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(minutes=2)
    })
    
    return {"message": "Offer sent"}

@api_router.get("/webrtc/offer/{chat_id}")
async def get_webrtc_offer(chat_id: str, current_user: AnonymousUser = Depends(get_current_user)):
    """Get WebRTC offer for incoming call"""
    offer = await db.webrtc_offers.find_one({
        "chat_id": chat_id,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    
    if not offer:
        raise HTTPException(status_code=404, detail="No active offer found")
    
    return {
        "offer": offer["offer"],
        "caller_id": offer["caller_id"]
    }

@api_router.post("/webrtc/answer")
async def send_webrtc_answer(answer_data: WebRTCAnswer, current_user: AnonymousUser = Depends(get_current_user)):
    """Send WebRTC answer for call setup"""
    await db.webrtc_answers.insert_one({
        "chat_id": answer_data.chat_id,
        "receiver_id": current_user.id,
        "answer": answer_data.answer,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(minutes=2)
    })
    
    return {"message": "Answer sent"}

@api_router.get("/webrtc/answer/{chat_id}")
async def get_webrtc_answer(chat_id: str, current_user: AnonymousUser = Depends(get_current_user)):
    """Get WebRTC answer from receiver"""
    answer = await db.webrtc_answers.find_one({
        "chat_id": chat_id,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    
    if not answer:
        raise HTTPException(status_code=404, detail="No answer found")
    
    return {
        "answer": answer["answer"],
        "receiver_id": answer["receiver_id"]
    }

@api_router.post("/webrtc/ice-candidate")
async def send_ice_candidate(candidate_data: ICECandidate, current_user: AnonymousUser = Depends(get_current_user)):
    """Send ICE candidate for WebRTC connection"""
    await db.ice_candidates.insert_one({
        "chat_id": candidate_data.chat_id,
        "sender_id": current_user.id,
        "candidate": candidate_data.candidate,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(minutes=5)
    })
    
    return {"message": "ICE candidate sent"}

@api_router.get("/webrtc/ice-candidates/{chat_id}")
async def get_ice_candidates(chat_id: str, current_user: AnonymousUser = Depends(get_current_user)):
    """Get ICE candidates for WebRTC connection"""
    candidates = await db.ice_candidates.find({
        "chat_id": chat_id,
        "sender_id": {"$ne": current_user.id},  # Get candidates from other user
        "expires_at": {"$gt": datetime.utcnow()}
    }).to_list(100)
    
    return [{"candidate": c["candidate"], "sender_id": c["sender_id"]} for c in candidates]

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "kriptonit-backend"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
