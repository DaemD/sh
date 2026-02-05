# Backend - Voice ChatGPT Clone

FastAPI backend for voice-enabled ChatGPT clone.

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Create `.env` file:**
   ```env
   OPENAI_API_KEY=your_openai_api_key
   ELEVENLABS_API_KEY=your_elevenlabs_api_key
   ELEVENLABS_VOICE_ID=your_elevenlabs_voice_id
   ```

3. **Run the server:**
   ```bash
   python main.py
   ```

   Or with uvicorn:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

## API Endpoints

- `POST /api/chat/voice` - Voice chat endpoint
- `POST /api/chat/text` - Text chat endpoint
- `GET /api/chat/{session_id}/history` - Get chat history
- `DELETE /api/chat/{session_id}` - Clear chat history
- `GET /api/health` - Health check

## Project Structure

```
backend/
├── main.py              # FastAPI application
├── services/
│   ├── voice_chat_service.py  # Core voice processing
│   └── text_to_speech.py      # TTS service
├── models/
│   └── scene_models.py        # Data models
├── temp/                # Temporary audio files
└── requirements.txt     # Python dependencies
```

## Deployment

See `../DEPLOYMENT.md` for deployment instructions.

