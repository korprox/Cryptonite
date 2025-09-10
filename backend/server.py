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
    caller_id: str

class WebRTCAnswer(BaseModel):
    chat_id: str
    answer: dict
    receiver_id: str

class ICECandidate(BaseModel):
    chat_id: str
    candidate: dict
    sender_id: str

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