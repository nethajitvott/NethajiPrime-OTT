# main.py - Nethaji Prime OTT Backend API

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from supabase import create_client, Client
from dotenv import load_dotenv
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from pydantic import BaseModel
import hashlib
import os

# Load environment variables from .env file
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Nethaji Prime OTT API",
    description="Backend API for Nethaji Prime Platform",
    version="2.0.0"
)

# Get allowed origins from environment
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000"
).split(",")

# CORS middleware - allows frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect to Supabase using environment variables
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

# ============================================
# AUTHENTICATION SETUP
# ============================================

# JWT settings from environment
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-dev-secret-key-change-this")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Pydantic models
class UserSignup(BaseModel):
    email: str
    password: str
    full_name: str

class SpeechCreate(BaseModel):
    title: str
    speaker_name: str
    description: str
    category: str
    language: str
    video_url: str = "PENDING_UPLOAD"
    thumbnail_url: str = None

class ApproveRequest(BaseModel):
    video_url: str

class RejectRequest(BaseModel):
    reason: str

# Helper functions - Using SHA256 for password hashing
def verify_password(plain_password, hashed_password):
    try:
        computed_hash = hashlib.sha256(plain_password.encode()).hexdigest()
        print(f"DEBUG - Plain password: {plain_password}")
        print(f"DEBUG - Computed hash: {computed_hash}")
        print(f"DEBUG - Stored hash: {hashed_password}")
        print(f"DEBUG - Match: {computed_hash == hashed_password}")
        return computed_hash == hashed_password
    except Exception as e:
        print(f"Password verification error: {e}")
        return False

def get_password_hash(password):
    try:
        if len(password) > 72:
            password = password[:72]
        return hashlib.sha256(password.encode()).hexdigest()
    except Exception as e:
        print(f"Password hashing error: {e}")
        raise HTTPException(status_code=500, detail=f"Password hashing failed: {str(e)}")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        
        # Get user from database
        response = supabase.table('users').select('*').eq('email', email).execute()
        if not response.data:
            raise HTTPException(status_code=401, detail="User not found")
        
        return response.data[0]
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication")

# ============================================
# AUTHENTICATION ENDPOINTS
# ============================================

@app.post("/signup")
async def signup(user_data: UserSignup):
    """Create a new user account"""
    try:
        print(f"Signup attempt for: {user_data.email}")
        
        # Validate password length
        if len(user_data.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        
        if len(user_data.password) > 72:
            raise HTTPException(status_code=400, detail="Password too long. Maximum 72 characters.")
        
        # Check if user exists
        existing = supabase.table('users').select('*').eq('email', user_data.email).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Hash password
        print(f"Hashing password for {user_data.email}...")
        hashed_password = get_password_hash(user_data.password)
        print(f"Password hashed successfully. Hash length: {len(hashed_password)}")
        
        # Create user
        new_user = {
            'email': user_data.email,
            'password_hash': hashed_password,
            'full_name': user_data.full_name,
            'is_superadmin': False
        }
        
        print(f"Inserting user into database...")
        result = supabase.table('users').insert(new_user).execute()
        print(f"User created successfully: {user_data.email}")
        
        return {
            "success": True,
            "message": "User created successfully"
        }
    except HTTPException as e:
        print(f"HTTPException during signup: {e.detail}")
        raise e
    except Exception as e:
        print(f"Unexpected error during signup: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login and get access token"""
    try:
        print(f"Login attempt for: {form_data.username}")
        
        # Query user from Supabase
        response = supabase.table('users').select('*').eq('email', form_data.username).execute()
        
        if not response.data:
            print(f"User not found: {form_data.username}")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        user = response.data[0]
        print(f"User found: {user['email']}")
        
        # Verify password
        if not verify_password(form_data.password, user['password_hash']):
            print(f"Password verification failed for {form_data.username}")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        print(f"Password verified successfully for {form_data.username}")
        
        # Create access token
        access_token = create_access_token(data={"sub": user['email']})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user['id'],
                "email": user['email'],
                "full_name": user.get('full_name'),
                "is_superadmin": user.get('is_superadmin', False)
            }
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Unexpected error during login: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# SPEECH MANAGEMENT ENDPOINTS
# ============================================

@app.post("/speeches")
async def create_speech(speech: SpeechCreate, current_user: dict = Depends(get_current_user)):
    """Create a new speech/video entry"""
    try:
        new_speech = {
            **speech.dict(),
            "uploaded_by": current_user['id'],
            "approval_status": "pending",
            "is_public": False
        }
        
        result = supabase.table("speeches").insert(new_speech).execute()
        
        return {
            "success": True,
            "message": "Speech submitted for approval",
            "speech": result.data[0]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/speeches/{speech_id}/approve")
async def approve_speech(speech_id: str, approve_data: ApproveRequest, current_user: dict = Depends(get_current_user)):
    """Approve a speech and set its video URL"""
    try:
        # Check if user is superadmin
        if not current_user.get('is_superadmin'):
            raise HTTPException(status_code=403, detail="Only admins can approve speeches")
        
        # Update speech
        result = supabase.table("speeches").update({
            "video_url": approve_data.video_url,
            "approval_status": "approved",
            "approved_by": current_user['id'],
            "approved_at": datetime.utcnow().isoformat(),
            "is_public": True
        }).eq("id", speech_id).execute()
        
        return {
            "success": True,
            "message": "Speech approved successfully"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/speeches/{speech_id}/reject")
async def reject_speech(speech_id: str, reject_data: RejectRequest, current_user: dict = Depends(get_current_user)):
    """Reject a speech"""
    try:
        # Check if user is superadmin
        if not current_user.get('is_superadmin'):
            raise HTTPException(status_code=403, detail="Only admins can reject speeches")
        
        # Update speech
        result = supabase.table("speeches").update({
            "approval_status": "rejected",
            "rejection_reason": reject_data.reason,
            "is_public": False
        }).eq("id", speech_id).execute()
        
        return {
            "success": True,
            "message": "Speech rejected"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# PUBLIC API ENDPOINTS
# ============================================

@app.get("/")
def home():
    return {
        "message": "Welcome to Nethaji Prime OTT API! 🇮🇳",
        "status": "running",
        "version": "2.0.0",
        "endpoints": {
            "speeches": "/speeches",
            "categories": "/categories",
            "search": "/search?q=keyword",
            "login": "/login",
            "signup": "/signup",
            "docs": "/docs"
        }
    }

@app.get("/speeches")
def get_speeches(limit: int = 50, offset: int = 0):
    """Get all approved speeches with pagination"""
    try:
        response = supabase.table("speeches").select("*").eq("is_public", True).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        return {
            "success": True,
            "count": len(response.data),
            "speeches": response.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/speeches/{speech_id}")
def get_speech(speech_id: str):
    """Get a single speech by ID"""
    try:
        response = supabase.table("speeches").select("*").eq("id", speech_id).single().execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Speech not found")
        return {
            "success": True,
            "speech": response.data
        }
    except Exception as e:
        if "404" in str(e):
            raise HTTPException(status_code=404, detail="Speech not found")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/search")
def search_speeches(q: str):
    """Search speeches by title, speaker, or description"""
    try:
        response = supabase.table("speeches").select("*").eq("is_public", True).or_(
            f"title.ilike.%{q}%,speaker_name.ilike.%{q}%,description.ilike.%{q}%"
        ).execute()
        return {
            "success": True,
            "query": q,
            "count": len(response.data),
            "speeches": response.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/speeches/category/{category}")
def get_speeches_by_category(category: str):
    """Get all speeches in a specific category"""
    try:
        response = supabase.table("speeches").select("*").eq("category", category).eq("is_public", True).execute()
        return {
            "success": True,
            "category": category,
            "count": len(response.data),
            "speeches": response.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/speeches/language/{language}")
def get_speeches_by_language(language: str):
    """Get all speeches in a specific language"""
    try:
        response = supabase.table("speeches").select("*").eq("language", language).eq("is_public", True).execute()
        return {
            "success": True,
            "language": language,
            "count": len(response.data),
            "speeches": response.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/speeches/featured/list")
def get_featured_speeches():
    """Get all featured speeches"""
    try:
        response = supabase.table("speeches").select("*").eq("is_featured", True).eq("is_public", True).execute()
        return {
            "success": True,
            "count": len(response.data),
            "speeches": response.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/speeches/{speech_id}/view")
def increment_views(speech_id: str):
    """Increment view count for a speech"""
    try:
        response = supabase.table("speeches").select("views_count").eq("id", speech_id).single().execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Speech not found")
        
        current_views = response.data.get("views_count", 0)
        
        supabase.table("speeches").update({
            "views_count": current_views + 1
        }).eq("id", speech_id).execute()
        
        return {
            "success": True,
            "message": "View counted",
            "views": current_views + 1
        }
    except Exception as e:
        if "404" in str(e):
            raise HTTPException(status_code=404, detail="Speech not found")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/categories")
def get_categories():
    """Get all speech categories"""
    try:
        response = supabase.table("speech_categories").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/speeches/recent/{limit}")
def get_recent_speeches(limit: int = 10):
    """Get most recently uploaded speeches"""
    try:
        response = supabase.table("speeches").select("*").eq("is_public", True).order("upload_date", desc=True).limit(limit).execute()
        return {
            "success": True,
            "count": len(response.data),
            "speeches": response.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    """Check if API and database are working"""
    try:
        supabase.table("speeches").select("id").limit(1).execute()
        return {
            "status": "healthy",
            "database": "connected",
            "environment": "production" if os.getenv("SECRET_KEY") else "development"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }

# ============================================
# Run the server
# ============================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)