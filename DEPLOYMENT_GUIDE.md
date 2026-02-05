# Deployment Guide

## Frontend (Vercel) + Backend (Railway)

### 1. Backend Deployment on Railway

1. **Connect your GitHub repository** to Railway
2. **Set environment variables** in Railway dashboard:
   ```
   OPENAI_API_KEY=your_openai_api_key
   ELEVENLABS_API_KEY=your_elevenlabs_api_key
   ELEVENLABS_VOICE_ID=your_elevenlabs_voice_id
   ```
3. **Railway will automatically deploy** using the configuration files:
   - `nixpacks.toml` - Build configuration
   - `runtime.txt` - Python 3.11 specification
   - `Procfile` - Start command

4. **Note your Railway URL**: `https://your-app-name.railway.app`

### 2. Frontend Deployment on Vercel

1. **Connect your GitHub repository** to Vercel
2. **Set build settings**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

3. **Set environment variables** in Vercel dashboard:
   ```
   VITE_API_URL=https://your-railway-backend-url.railway.app
   ```

4. **Deploy** - Vercel will automatically build and deploy

### 3. Testing the Connection

1. **Open your Vercel URL**: `https://your-app.vercel.app`
2. **Click "Start Voice Chat"** to test the connection
3. **Check browser console** for any CORS or connection errors

### 4. Troubleshooting

**CORS Issues:**
- Backend already includes CORS headers for `*.vercel.app` and `*.railway.app`
- If you get CORS errors, check that your environment variable is set correctly

**API Connection Issues:**
- Verify `VITE_API_URL` in Vercel matches your Railway URL exactly
- Check Railway logs for backend errors
- Test backend health: `https://your-railway-url.railway.app/api/health`

**Audio Issues:**
- HTTPS is required for microphone access (both Vercel and Railway provide HTTPS)
- Check browser permissions for microphone access

### 5. Environment Variables Summary

**Railway (Backend):**
```
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=...
```

**Vercel (Frontend):**
```
VITE_API_URL=https://your-railway-backend.railway.app
```

### 6. Build Commands Reference

**Railway (Backend):**
- Build: `cd backend && pip install -r requirements.txt`
- Start: `cd backend && python main.py`

**Vercel (Frontend):**
- Build: `npm run build` (in frontend directory)
- Output: `dist/`

Your voice chat app will now work across the internet! 🎉