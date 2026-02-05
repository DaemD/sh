import os
import requests
from dotenv import load_dotenv

load_dotenv()

class TextToSpeechService:
    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY")
        self.voice_id = os.getenv("ELEVENLABS_VOICE_ID")
        self.base_url = "https://api.elevenlabs.io/v1"
        
    async def generate_speech(self, text: str, filename: str = None) -> str:
        """Generate speech using ElevenLabs API"""
        
        print(f"DEBUG - ElevenLabs TTS: Generating speech")
        print(f"DEBUG - Text length: {len(text)} characters")
        
        if not self.api_key or not self.voice_id:
            raise Exception("ElevenLabs API key or Voice ID not found in environment variables")
        
        url = f"{self.base_url}/text-to-speech/{self.voice_id}"
        
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": self.api_key
        }
        
        data = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.5
            }
        }
        
        try:
            response = requests.post(url, json=data, headers=headers)
            
            if response.status_code != 200:
                print(f"DEBUG - ElevenLabs TTS error: {response.text}")
                raise Exception(f"ElevenLabs API error: {response.status_code} - {response.text}")
            
            # Save audio file
            if not filename:
                import uuid
                filename = f"speech_{uuid.uuid4().hex[:8]}.mp3"
            
            # Use temp directory relative to backend folder
            backend_dir = os.path.dirname(os.path.dirname(__file__))
            temp_dir = os.path.join(backend_dir, "temp")
            os.makedirs(temp_dir, exist_ok=True)
            audio_path = os.path.join(temp_dir, filename)
            
            with open(audio_path, "wb") as f:
                f.write(response.content)
            
            print(f"DEBUG - Audio saved to: {audio_path}")
            return audio_path
            
        except Exception as e:
            print(f"DEBUG - TTS error: {e}")
            raise