# Voice ChatGPT Clone

A professional voice-enabled ChatGPT clone built with React and FastAPI. Users can speak to the AI and receive voice responses, creating a natural conversational experience.

## Features

- 🎤 **Voice Input**: Speak to the AI using your microphone
- 🔊 **Voice Output**: AI responds with natural-sounding speech
- 💬 **Text Input**: Also supports traditional text chat
- 🎨 **Professional UI**: Clean, ChatGPT-inspired interface
- 🔄 **Real-time**: Instant voice-to-voice conversations

## Tech Stack

**Frontend:**
- React 18 with Vite
- Tailwind CSS for styling
- Axios for API calls
- Lucide React for icons

**Backend:**
- FastAPI (Python)
- OpenAI GPT-4o-mini for AI responses
- ElevenLabs for Speech-to-Text (STT) and Text-to-Speech (TTS)

## Setup Instructions

### 1. Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure API keys in `.env`:**
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   ELEVENLABS_VOICE_ID=your_elevenlabs_voice_id_here
   ```

4. **Start the backend server:**
   ```bash
   python main.py
   ```
   Backend will run on `http://localhost:8000`

### 2. Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Frontend will run on `http://localhost:3000`

### 3. Usage

1. Open `http://localhost:3000` in your browser
2. **Voice Chat**: Click the microphone button and speak
3. **Text Chat**: Type a message and press Enter or click Send
4. **Audio Controls**: Use the volume button to replay AI responses
5. **Clear Chat**: Use the refresh button to start a new conversation

## API Keys Required

### OpenAI API Key
- Get from: https://platform.openai.com/api-keys
- Used for: GPT-4o-mini AI responses

### ElevenLabs API Key & Voice ID
- Get from: https://elevenlabs.io/
- Used for: Speech-to-Text and Text-to-Speech
- Voice ID: Choose from your ElevenLabs voice library

## Project Structure

```
├── backend/                # Python FastAPI backend
│   ├── main.py            # FastAPI server
│   ├── services/
│   │   ├── voice_chat_service.py    # Core voice chat logic
│   │   └── text_to_speech.py        # TTS utilities
│   ├── models/           # Data models
│   ├── temp/              # Temporary audio files
│   ├── requirements.txt   # Python dependencies
│   └── .env               # API keys (create this)
├── frontend/              # React frontend
│   ├── src/
│   │   ├── App.jsx        # Main React component
│   │   ├── main.jsx       # React entry point
│   │   └── index.css      # Tailwind styles
│   ├── package.json       # Node.js dependencies
│   └── vite.config.js     # Vite configuration
└── DEPLOYMENT.md          # Deployment guide
```

## How It Works

1. **Voice Input**: User speaks → Browser records audio → Sent to backend
2. **Speech-to-Text**: ElevenLabs converts audio to text
3. **AI Processing**: GPT-4o-mini generates response based on conversation history
4. **Text-to-Speech**: ElevenLabs converts AI response to audio
5. **Voice Output**: Audio is played automatically in the browser

## Development

- **Backend**: FastAPI with auto-reload on `http://localhost:8000`
- **Frontend**: Vite dev server with hot-reload on `http://localhost:3000`
- **API Docs**: Available at `http://localhost:8000/docs`

## Troubleshooting

- **Microphone not working**: Check browser permissions
- **API errors**: Verify API keys in `backend/.env` file
- **Audio not playing**: Check browser audio permissions
- **CORS issues**: Backend is configured for `localhost:3000`

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

You can deploy:
- **Separately**: Frontend and backend on different platforms (recommended)
- **Together**: Both on the same server

## License

MIT License - feel free to use and modify as needed.