"""Gemini Live Speech-to-Text service for real-time audio processing"""
import os
import asyncio
from typing import Optional, Callable, List
from google import genai
from google.genai import types


class STTService:
    """Real-time Speech-to-Text using Gemini Live API"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY not found in environment")

        self.model = os.getenv("GEMINI_LIVE_MODEL", "gemini-3.1-flash-live-preview")
        fallback_models_raw = os.getenv(
            "GEMINI_LIVE_MODEL_FALLBACKS",
            "gemini-2.5-flash-native-audio-preview-12-2025",
        )
        self.live_models = self._dedupe_preserve_order(
            [self.model] + [m.strip() for m in fallback_models_raw.split(",") if m.strip()]
        )

        self.api_version = os.getenv("GEMINI_LIVE_API_VERSION", "v1beta")
        fallback_versions_raw = os.getenv("GEMINI_LIVE_API_FALLBACKS", "v1alpha")
        self.api_versions = self._dedupe_preserve_order(
            [self.api_version] + [v.strip() for v in fallback_versions_raw.split(",") if v.strip()]
        )

        self.client = None
        self.connection = None
        self.connection_context = None
        self.is_connected = False
        self.listen_task: Optional[asyncio.Task] = None
        
        self.transcript_callback: Optional[Callable] = None
        self.audio_callback: Optional[Callable] = None

    @staticmethod
    def _dedupe_preserve_order(items: List[str]) -> List[str]:
        seen = set()
        result = []
        for item in items:
            if item not in seen:
                seen.add(item)
                result.append(item)
        return result

    def _build_async_client(self, api_version: str):
        return genai.Client(
            api_key=self.api_key,
            http_options=types.HttpOptions(api_version=api_version),
        ).aio
    
    async def start_stream(self, transcript_callback: Callable, audio_callback: Optional[Callable] = None):
        """Start live transcription stream using Gemini Live API."""
        self.transcript_callback = transcript_callback
        self.audio_callback = audio_callback

        last_error = None
        for api_version in self.api_versions:
            for model_name in self.live_models:
                try:
                    candidate_client = self._build_async_client(api_version)
                    candidate_context = candidate_client.live.connect(
                        model=model_name,
                        config=types.LiveConnectConfig(
                            # Live audio models require AUDIO modality.
                            response_modalities=["AUDIO"],
                            # Enable both input and output transcription
                            input_audio_transcription=types.AudioTranscriptionConfig(),
                            output_audio_transcription=types.AudioTranscriptionConfig(),
                            temperature=0.0,
                        ),
                    )

                    candidate_connection = await candidate_context.__aenter__()

                    self.client = candidate_client
                    self.connection_context = candidate_context
                    self.connection = candidate_connection
                    self.api_version = api_version
                    self.model = model_name
                    self.listen_task = asyncio.create_task(self._listen_for_transcripts())
                    self.is_connected = True
                    print(
                        f"✅ Gemini Live WebSocket connected (model={self.model}, api_version={self.api_version})"
                    )
                    return True

                except Exception as e:
                    last_error = e
                    print(
                        f"⚠️ Live connect failed (model={model_name}, api_version={api_version}): {e}"
                    )

        print(f"❌ Error starting Gemini Live stream: {last_error}")
        import traceback
        traceback.print_exc()
        return False

    async def _listen_for_transcripts(self):
        """Listen for Gemini Live events and forward transcript/audio payloads."""
        try:
            async for message in self.connection.receive():
                server_content = getattr(message, "server_content", None)
                if not server_content:
                    continue

                input_transcription = getattr(server_content, "input_transcription", None)
                if input_transcription:
                    transcript_text = (getattr(input_transcription, "text", "") or "").strip()
                    is_finished = getattr(input_transcription, "finished", None)
                    print(f"🎤 Input transcript: '{transcript_text}' (finished={is_finished})")
                    # Match veyra-ai: forward all non-empty transcripts immediately
                    if transcript_text and self.transcript_callback:
                        asyncio.create_task(
                            self.transcript_callback(
                                text=transcript_text,
                                speaker="unknown",
                                confidence=None,
                            )
                        )

                output_transcription = getattr(server_content, "output_transcription", None)
                if output_transcription:
                    transcript_text = (getattr(output_transcription, "text", "") or "").strip()
                    is_finished = getattr(output_transcription, "finished", None)
                    print(f"🤖 Output transcript: '{transcript_text}' (finished={is_finished})")
                    # Match veyra-ai: forward all non-empty transcripts immediately
                    if transcript_text and self.transcript_callback:
                        asyncio.create_task(
                            self.transcript_callback(
                                text=transcript_text,
                                speaker="assistant",
                                confidence=None,
                            )
                        )

                model_turn = getattr(server_content, "model_turn", None)
                parts = getattr(model_turn, "parts", None) if model_turn else None
                if parts and self.audio_callback:
                    for part in parts:
                        inline_data = getattr(part, "inline_data", None)
                        if not inline_data:
                            continue
                        audio_bytes = getattr(inline_data, "data", None)
                        mime_type = getattr(inline_data, "mime_type", "audio/pcm")
                        if audio_bytes:
                            asyncio.create_task(self.audio_callback(audio_bytes, mime_type))
        except Exception as e:
            if self.is_connected:
                print(f"❌ Error processing Gemini transcript stream: {e}")
            import traceback
            traceback.print_exc()
    
    async def send_audio(self, audio_data: bytes):
        """Send PCM audio data to Gemini Live."""
        if self.connection and self.is_connected:
            try:
                await self.connection.send_realtime_input(
                    audio={
                        "data": audio_data,
                        "mime_type": "audio/pcm;rate=16000",
                    }
                )
                print(f"🎵 Sent {len(audio_data)} bytes of audio")
            except Exception as e:
                print(f"❌ Error sending audio: {e}")
        else:
            print("⚠️ Connection not active, cannot send audio")
    
    async def close(self):
        """Close the connection"""
        if self.connection:
            try:
                try:
                    await self.connection.send_realtime_input(audio_stream_end=True)
                except Exception:
                    pass

                if self.listen_task:
                    self.listen_task.cancel()
                    try:
                        await self.listen_task
                    except asyncio.CancelledError:
                        pass

                if self.connection_context:
                    await self.connection_context.__aexit__(None, None, None)
                    self.connection_context = None

                self.connection = None
                self.is_connected = False
                print("✅ Gemini Live connection closed")
            except Exception as e:
                print(f"❌ Error closing connection: {e}")
