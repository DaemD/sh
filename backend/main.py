from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from typing import Dict, List, Optional
import uuid

from services.voice_chat_service import VoiceChatService
from services.auth_service import request_otp, verify_otp, verify_token

app = FastAPI(title="Voice ChatGPT Clone")

# CORS middleware for React frontend - Updated for deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:5173",
        "https://*.vercel.app",
        "https://sh-eight-rust.vercel.app",  # Your specific Vercel domain
        "https://*.netlify.app",
        "https://*.railway.app",
        "*"  # Allow all origins for deployment
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create temp directory for temporary files (if needed)
TEMP_DIR = os.path.join(os.path.dirname(__file__), "temp")
os.makedirs(TEMP_DIR, exist_ok=True)

# In-memory chat sessions
chat_sessions: Dict[str, List[Dict]] = {}


def require_auth(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.replace("Bearer ", "").strip()
    if not verify_token(token):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return token


class RequestOtpBody(BaseModel):
    email: str


class VerifyOtpBody(BaseModel):
    email: str
    otp: str


@app.post("/api/auth/request-otp")
async def auth_request_otp(body: RequestOtpBody):
    """Request OTP for the given email. Only works if email matches MFA_EMAIL in env."""
    success, msg = request_otp(body.email)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"success": True, "message": msg}


@app.post("/api/auth/verify-otp")
async def auth_verify_otp(body: VerifyOtpBody):
    """Verify OTP and return session token."""
    token = verify_otp(body.email, body.otp)
    if not token:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    return {"success": True, "token": token}


@app.get("/api/config")
async def get_config(_: str = Depends(require_auth)):
    """Return ElevenLabs agent ID for frontend (stored in backend env)."""
    agent_id = (os.getenv("ELEVENLABS_AGENT_ID") or "").strip()
    if not agent_id:
        raise HTTPException(status_code=503, detail="Agent ID not configured")
    return {"agentId": agent_id}


@app.get("/api/convai/signed-url")
def get_signed_url(_: str = Depends(require_auth)):
    """Return a signed URL for ElevenLabs Conversational AI (required for auth-enabled agents)."""
    import requests
    agent_id = (os.getenv("ELEVENLABS_AGENT_ID") or "").strip()
    api_key = (os.getenv("ELEVENLABS_API_KEY") or "").strip()
    if not agent_id or not api_key:
        raise HTTPException(status_code=503, detail="Agent or API key not configured")

    url = f"https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id={agent_id}"
    resp = requests.get(url, headers={"xi-api-key": api_key})
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"ElevenLabs error: {resp.text[:200]}")

    data = resp.json()
    signed_url = data.get("signed_url")
    if not signed_url:
        raise HTTPException(status_code=502, detail="No signed URL in response")
    return {"signedUrl": signed_url}


@app.post("/api/chat/voice")
async def voice_chat(
    audio: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    _: str = Depends(require_auth),
):
    """Handle voice input and return voice response"""
    
    if not session_id:
        session_id = str(uuid.uuid4())
    
    # Initialize session if new
    if session_id not in chat_sessions:
        chat_sessions[session_id] = []
    
    print(f"DEBUG - Voice chat request for session {session_id}")
    print(f"DEBUG - Audio file: {audio.filename}, content_type: {audio.content_type}")
    
    try:
        # Initialize voice chat service
        voice_service = VoiceChatService()
        
        # Process voice input and get voice response
        result = await voice_service.process_voice_message(audio, session_id, chat_sessions[session_id])
        
        # Update chat history
        chat_sessions[session_id].extend([
            {"role": "user", "content": result["user_text"]},
            {"role": "assistant", "content": result["ai_text"]}
        ])
        
        print(f"DEBUG - Voice chat completed successfully for session {session_id}")
        
        return {
            "session_id": session_id,
            "user_text": result["user_text"],
            "ai_text": result["ai_text"],
            "ai_audio_data": result["ai_audio_data"],
            "chat_history": chat_sessions[session_id]
        }
        
    except Exception as e:
        print(f"DEBUG - Voice chat error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Voice chat failed: {str(e)}")

@app.get("/api/chat/{session_id}/history")
async def get_chat_history(session_id: str, _: str = Depends(require_auth)):
    """Get chat history for a session"""
    
    if session_id not in chat_sessions:
        return {"session_id": session_id, "chat_history": []}
    
    return {
        "session_id": session_id,
        "chat_history": chat_sessions[session_id]
    }

@app.delete("/api/chat/{session_id}")
async def clear_chat_history(session_id: str, _: str = Depends(require_auth)):
    """Clear chat history for a session"""
    
    if session_id in chat_sessions:
        del chat_sessions[session_id]
    
    return {"message": "Chat history cleared"}

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    
    # Check API keys
    elevenlabs_key = os.getenv("ELEVENLABS_API_KEY")
    elevenlabs_voice = os.getenv("ELEVENLABS_VOICE_ID")
    openai_key = os.getenv("OPENAI_API_KEY")
    
    return {
        "status": "healthy",
        "services": {
            "elevenlabs_api": "✅" if elevenlabs_key else "❌",
            "elevenlabs_voice": "✅" if elevenlabs_voice else "❌",
            "openai_api": "✅" if openai_key else "❌"
        }
    }

if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment variable (Railway sets this automatically)
    port = int(os.getenv("PORT", 8000))
    
    print("🚀 Starting Voice ChatGPT Clone Backend")
    print(f"🔧 Backend API running on port {port}")
    
    uvicorn.run(app, host="0.0.0.0", port=port)