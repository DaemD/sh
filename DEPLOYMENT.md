# Deployment Guide

This project is organized into separate frontend and backend folders for easy deployment.

## Project Structure

```
poems/
├── backend/          # Python FastAPI backend
│   ├── main.py
│   ├── services/
│   ├── models/
│   ├── requirements.txt
│   └── temp/         # Temporary audio files
├── frontend/         # React frontend
│   ├── src/
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Deployment Options

### Option 1: Separate Deployment (Recommended)

Deploy frontend and backend separately for better scalability and flexibility.

#### Backend Deployment (Python/FastAPI)

**Platforms:**
- **Railway**: Easy Python deployment
- **Render**: Free tier available
- **Heroku**: Classic platform
- **DigitalOcean App Platform**: Simple deployment
- **AWS Elastic Beanstalk**: Enterprise option
- **Google Cloud Run**: Serverless option

**Steps:**
1. Navigate to backend folder:
   ```bash
   cd backend
   ```

2. Create a `.env` file with your API keys:
   ```env
   OPENAI_API_KEY=your_key_here
   ELEVENLABS_API_KEY=your_key_here
   ELEVENLABS_VOICE_ID=your_voice_id_here
   ```

3. Deploy using your platform's instructions
   - Most platforms auto-detect Python and install from `requirements.txt`
   - Set start command: `python main.py` or `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. Note your backend URL (e.g., `https://your-backend.railway.app`)

#### Frontend Deployment (React/Vite)

**Platforms:**
- **Vercel**: Best for React (recommended)
- **Netlify**: Easy deployment
- **GitHub Pages**: Free hosting
- **Cloudflare Pages**: Fast CDN
- **AWS Amplify**: AWS integration

**Steps:**
1. Navigate to frontend folder:
   ```bash
   cd frontend
   ```

2. Update API endpoint in `vite.config.js`:
   ```js
   proxy: {
     '/api': {
       target: 'https://your-backend-url.com',  // Your deployed backend URL
       changeOrigin: true,
     }
   }
   ```

3. For production, update `frontend/src/App.jsx` axios calls:
   ```js
   const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://your-backend-url.com';
   ```

4. Create `.env.production`:
   ```env
   VITE_API_URL=https://your-backend-url.com
   ```

5. Build and deploy:
   ```bash
   npm run build
   # Deploy the 'dist' folder to your platform
   ```

### Option 2: Combined Deployment

Deploy both together on a single server (VPS, EC2, etc.)

**Steps:**
1. Build frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. Copy build to backend:
   ```bash
   cp -r dist ../backend/static
   ```

3. Update `backend/main.py` to serve static files:
   ```python
   app.mount("/", StaticFiles(directory="static", html=True), name="static")
   ```

4. Deploy backend (frontend is included)

## Environment Variables

### Backend (.env in backend folder)
```env
OPENAI_API_KEY=your_openai_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_elevenlabs_voice_id
```

### Frontend (.env.production)
```env
VITE_API_URL=https://your-backend-url.com
```

## CORS Configuration

If deploying separately, update CORS in `backend/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://your-frontend-domain.com"  # Add your frontend URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Quick Deploy Commands

### Backend (Railway/Render)
```bash
cd backend
# Platform will auto-detect and deploy
```

### Frontend (Vercel)
```bash
cd frontend
npm run build
# Deploy dist folder or connect GitHub repo
```

## Testing Deployment

1. **Backend Health Check:**
   ```bash
   curl https://your-backend-url.com/api/health
   ```

2. **Frontend:**
   - Visit your frontend URL
   - Check browser console for API connection
   - Test voice recording

## Troubleshooting

- **CORS Errors**: Update `allow_origins` in backend CORS middleware
- **API Not Found**: Check `VITE_API_URL` in frontend environment
- **Audio Issues**: Ensure backend has write permissions for `temp/` folder
- **Build Errors**: Check Node.js and Python versions match requirements

