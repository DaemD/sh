from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import os
import asyncio
from typing import Dict, List, Optional
import uuid

from services.voice_chat_service import VoiceChatService

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

class ChatMessage(BaseModel):
    message: str
    session_id: str = None

@app.post("/api/chat/voice")
async def voice_chat(audio: UploadFile = File(...), session_id: Optional[str] = Form(None)):
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

@app.post("/api/chat/text")
async def text_chat(message: ChatMessage):
    """Handle text input and return voice response"""
    
    session_id = message.session_id or str(uuid.uuid4())
    
    # Initialize session if new
    if session_id not in chat_sessions:
        chat_sessions[session_id] = []
    
    try:
        # Initialize voice chat service
        voice_service = VoiceChatService()
        
        # Process text input and get voice response
        result = await voice_service.process_text_message(message.message, session_id, chat_sessions[session_id])
        
        # Update chat history
        chat_sessions[session_id].extend([
            {"role": "user", "content": message.message},
            {"role": "assistant", "content": result["ai_text"]}
        ])
        
        return {
            "session_id": session_id,
            "user_text": message.message,
            "ai_text": result["ai_text"],
            "ai_audio_data": result["ai_audio_data"],
            "chat_history": chat_sessions[session_id]
        }
        
    except Exception as e:
        print(f"DEBUG - Text chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chat/{session_id}/history")
async def get_chat_history(session_id: str):
    """Get chat history for a session"""
    
    if session_id not in chat_sessions:
        return {"session_id": session_id, "chat_history": []}
    
    return {
        "session_id": session_id,
        "chat_history": chat_sessions[session_id]
    }

@app.delete("/api/chat/{session_id}")
async def clear_chat_history(session_id: str):
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