import os
import base64
import tempfile
from typing import List, Dict
from dotenv import load_dotenv
from openai import OpenAI
from services.text_to_speech import TextToSpeechService

load_dotenv()

class VoiceChatService:
    def __init__(self):
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.tts_service = TextToSpeechService()
        
    async def process_voice_message(self, audio_file, session_id: str, chat_history: List[Dict]) -> Dict:
        """Process voice input: STT -> AI -> TTS"""
        
        print(f"DEBUG - Processing voice message for session {session_id}")
        
        # Step 1: Convert speech to text using OpenAI Whisper
        user_text = await self._speech_to_text(audio_file)
        print(f"DEBUG - Transcribed text: {user_text}")
        
        if not user_text or len(user_text.strip()) == 0:
            raise Exception("No speech detected in audio")
        
        # Step 2: Get AI response
        ai_text = await self._get_ai_response(user_text, chat_history)
        print(f"DEBUG - AI response: {ai_text[:100]}...")
        
        # Step 3: Convert AI text to speech
        audio_path = await self.tts_service.generate_speech(ai_text)
        
        # Step 4: Read audio file and convert to base64
        with open(audio_path, "rb") as f:
            audio_bytes = f.read()
        
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        audio_data_url = f"data:audio/mpeg;base64,{audio_base64}"
        
        # Clean up temp file
        try:
            os.remove(audio_path)
        except:
            pass
        
        return {
            "user_text": user_text,
            "ai_text": ai_text,
            "ai_audio_data": audio_data_url
        }
    
    async def process_text_message(self, text: str, session_id: str, chat_history: List[Dict]) -> Dict:
        """Process text input: AI -> TTS"""
        
        print(f"DEBUG - Processing text message for session {session_id}")
        
        # Step 1: Get AI response
        ai_text = await self._get_ai_response(text, chat_history)
        print(f"DEBUG - AI response: {ai_text[:100]}...")
        
        # Step 2: Convert AI text to speech
        audio_path = await self.tts_service.generate_speech(ai_text)
        
        # Step 3: Read audio file and convert to base64
        with open(audio_path, "rb") as f:
            audio_bytes = f.read()
        
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        audio_data_url = f"data:audio/mpeg;base64,{audio_base64}"
        
        # Clean up temp file
        try:
            os.remove(audio_path)
        except:
            pass
        
        return {
            "user_text": text,
            "ai_text": ai_text,
            "ai_audio_data": audio_data_url
        }
    
    async def _speech_to_text(self, audio_file) -> str:
        """Convert audio to text using OpenAI Whisper - expects WAV format"""
        
        # Read audio content first
        content = await audio_file.read()
        if len(content) == 0:
            raise Exception("Audio file is empty - no audio data received")
        
        print(f"DEBUG - Received audio file: {len(content)} bytes")
        print(f"DEBUG - Filename: {audio_file.filename}, Content-Type: {audio_file.content_type}")
        
        # Determine file extension from filename
        input_ext = ".wav"
        file_name = "audio.wav"
        
        if audio_file.filename:
            file_name = audio_file.filename
            if audio_file.filename.endswith('.wav'):
                input_ext = ".wav"
            elif audio_file.filename.endswith('.mp3'):
                input_ext = ".mp3"
            elif audio_file.filename.endswith('.m4a'):
                input_ext = ".m4a"
            elif audio_file.filename.endswith('.ogg'):
                input_ext = ".ogg"
            elif audio_file.filename.endswith('.webm'):
                input_ext = ".webm"
                # If webm is received, try to convert it
                print(f"DEBUG - WebM format received, will attempt conversion")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=input_ext) as tmp_file:
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        final_file_path = tmp_file_path
        final_file_name = file_name
        mime_type = "audio/wav"
        
        try:
            # If not WAV, try to convert (fallback for compatibility)
            if input_ext != ".wav":
                try:
                    print(f"DEBUG - Converting {input_ext} to WAV format")
                    audio = AudioSegment.from_file(tmp_file_path, format=input_ext.replace(".", ""))
                    if len(audio) == 0:
                        raise Exception("Converted audio is empty")
                    wav_file_path = tmp_file_path.replace(input_ext, ".wav")
                    audio.export(wav_file_path, format="wav")
                    print(f"DEBUG - Converted to WAV: {wav_file_path} ({os.path.getsize(wav_file_path)} bytes)")
                    # Remove original
                    try:
                        os.remove(tmp_file_path)
                    except:
                        pass
                    final_file_path = wav_file_path
                    final_file_name = "audio.wav"
                except Exception as conv_error:
                    print(f"DEBUG - Conversion failed, using original format: {conv_error}")
                    # Use original format
                    mime_type = f"audio/{input_ext.replace('.', '')}"
            
            # Verify file exists and has content
            if not os.path.exists(final_file_path):
                raise Exception(f"Audio file not found: {final_file_path}")
            
            file_size = os.path.getsize(final_file_path)
            print(f"DEBUG - Audio file: {final_file_path}, size: {file_size} bytes")
            
            if file_size == 0:
                raise Exception("Audio file is empty")
            
            # Use OpenAI Whisper API for transcription
            # WAV format is preferred and most reliable
            with open(final_file_path, "rb") as audio_file_obj:
                print(f"DEBUG - Sending to Whisper API: {final_file_name}, size: {file_size} bytes")
                try:
                    transcript = self.openai_client.audio.transcriptions.create(
                        model="whisper-1",
                        file=(final_file_name, audio_file_obj, mime_type),
                        # No language parameter - allows auto-detection (supports Urdu, English, etc.)
                    )
                except Exception as api_error:
                    print(f"DEBUG - Whisper API error: {api_error}")
                    raise Exception(f"Whisper API error: {str(api_error)}")
            
            transcribed_text = transcript.text.strip()
            print(f"DEBUG - Transcribed text: '{transcribed_text}' (length: {len(transcribed_text)})")
            
            if not transcribed_text:
                raise Exception("Whisper API returned empty transcription - no speech detected in audio")
            
            return transcribed_text
            
        except Exception as e:
            print(f"DEBUG - STT error: {e}")
            import traceback
            traceback.print_exc()
            error_msg = str(e)
            if "empty" in error_msg.lower():
                raise Exception("No speech detected in audio - the audio file may be empty or contain no speech")
            raise Exception(f"Speech-to-text failed: {error_msg}")
        finally:
            # Clean up temp files
            try:
                if final_file_path != tmp_file_path and os.path.exists(final_file_path):
                    os.remove(final_file_path)
                if os.path.exists(tmp_file_path):
                    os.remove(tmp_file_path)
            except Exception as cleanup_error:
                print(f"DEBUG - Cleanup error (non-critical): {cleanup_error}")
    
    async def _get_ai_response(self, user_message: str, chat_history: List[Dict]) -> str:
        """Get AI response from OpenAI GPT"""
        
        # Prepare messages for API
        messages = []
        
        # Add system message
        messages.append({
            "role": "system",
            "content": "You are a helpful, friendly, and conversational AI assistant. Keep your responses concise and natural, as if speaking in a voice conversation. ALWAYS respond in URDU only"
        })
        
        # Add chat history (limit to last 10 messages to avoid token limits)
        for msg in chat_history[-10:]:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        # Add current user message
        messages.append({
            "role": "user",
            "content": user_message
        })
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.7,
                max_tokens=500  # Keep responses concise for voice
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"DEBUG - AI error: {e}")
            raise Exception(f"AI response failed: {str(e)}")

