"""
Speech-to-Text service for audio transcription
"""
import os
import ssl
from typing import Dict, Any
import whisper


class STTService:
    """Service for speech-to-text transcription"""
    
    def __init__(self):
        self.use_google_stt = os.getenv("USE_GOOGLE_STT", "false").lower() == "true"
        
        if self.use_google_stt:
            from google.cloud import speech
            self.stt_client = speech.SpeechClient()
            self.whisper_model = None
        else:
            # Use Whisper for transcription
            try:
                print("🔄 Loading Whisper model (this may take a moment)...")
                # Bypass SSL verification for model download
                ssl._create_default_https_context = ssl._create_unverified_context
                self.whisper_model = whisper.load_model("base")
                print("✅ Whisper STT initialized successfully")
            except Exception as e:
                print(f"⚠️  Warning: Failed to load Whisper model. Error: {e}")
                self.whisper_model = None
    
    async def transcribe(self, audio_url: str) -> Dict[str, Any]:
        """
        Transcribe audio to text
        
        Args:
            audio_url: URL or path to audio file
        
        Returns:
            Dict with 'text' (transcript) and 'duration' (seconds)
        """
        if self.use_google_stt:
            return await self._transcribe_with_google(audio_url)
        else:
            return await self._transcribe_with_whisper(audio_url)
    
    async def _transcribe_with_google(self, audio_url: str) -> Dict[str, Any]:
        """Transcribe using Google Speech-to-Text"""
        from google.cloud import speech
        
        try:
            # Read audio file
            with open(audio_url.replace('/storage/audio/', './storage/audio/'), 'rb') as audio_file:
                content = audio_file.read()
            
            audio = speech.RecognitionAudio(content=content)
            config = speech.RecognitionConfig(
                encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
                sample_rate_hertz=48000,
                language_code="en-US",
                enable_automatic_punctuation=True,
                enable_word_time_offsets=True
            )
            
            response = self.stt_client.recognize(config=config, audio=audio)
            
            # Extract transcript
            transcript = " ".join([
                result.alternatives[0].transcript
                for result in response.results
            ])
            
            # Calculate duration from word timestamps
            duration = 0.0
            if response.results:
                last_result = response.results[-1]
                if last_result.alternatives[0].words:
                    last_word = last_result.alternatives[0].words[-1]
                    duration = last_word.end_time.total_seconds()
            
            return {
                "text": transcript,
                "duration": duration
            }
            
        except Exception as e:
            print(f"Google STT error: {e}")
            return self._fallback_transcript()
    
    async def _transcribe_with_whisper(self, audio_url: str) -> Dict[str, Any]:
        """
        Transcribe using OpenAI Whisper
        """
        # If no valid Whisper model, return mock data
        if not self.whisper_model:
            print("ℹ️  Using mock transcription (Whisper model not loaded)")
            return {
                "text": "[Mock transcription: This is a sample transcription of your debate speech.]",
                "duration": 5.0
            }
        
        try:
            # Read audio file
            audio_path = audio_url.replace('/storage/audio/', './storage/audio/')
            
            # Transcribe with Whisper (English only)
            result = self.whisper_model.transcribe(
                audio_path,
                language="en",  # Force English language
                task="transcribe"  # Transcribe (not translate)
            )
            
            # Get transcript and duration
            transcript = result["text"].strip()
            
            # Get duration from segments if available
            duration = 0.0
            if "segments" in result and result["segments"]:
                last_segment = result["segments"][-1]
                duration = last_segment.get("end", 0.0)
            
            # If duration not available, estimate from word count
            if duration == 0.0:
                word_count = len(transcript.split())
                duration = (word_count / 150) * 60  # 150 words per minute
            
            return {
                "text": transcript,
                "duration": duration
            }
            
        except Exception as e:
            print(f"❌ Whisper STT error: {e}")
            # Return mock data on error
            return {
                "text": "[Transcription failed - please check your audio file]",
                "duration": 5.0
            }
    
    def _fallback_transcript(self) -> Dict[str, Any]:
        """Fallback transcript if STT fails"""
        return {
            "text": "[Transcription unavailable - please check audio file]",
            "duration": 0.0
        }
