"""WebSocket handler for real-time audio streaming and communication"""
import base64
import json
from typing import Dict
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime

from app.models.schemas import (
    TranscriptSegment,
    ClinicalContext,
    ClinicalEntity
)
from app.services.session_manager import session_manager
from app.services.stt_service import STTService
from app.services.llm_service import llm_service
from app.services.nlp_service import nlp_service


class ConnectionManager:
    """Manages WebSocket connections"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.stt_services: Dict[str, STTService] = {}
        # Throttle auto question generation per session
        self.last_questions_update: Dict[str, datetime] = {}
        # Throttle auto context generation per session
        self.last_context_update: Dict[str, datetime] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        """Accept and store WebSocket connection"""
        await websocket.accept()
        self.active_connections[session_id] = websocket
        print(f"✅ WebSocket connected for session: {session_id}")
    
    def disconnect(self, session_id: str):
        """Remove WebSocket connection"""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.stt_services:
            del self.stt_services[session_id]
        if session_id in self.last_questions_update:
            del self.last_questions_update[session_id]
        if session_id in self.last_context_update:
            del self.last_context_update[session_id]
        print(f"🔌 WebSocket disconnected for session: {session_id}")
    
    async def send_message(self, session_id: str, message: dict):
        """Send message to specific client"""
        if session_id in self.active_connections:
            websocket = self.active_connections[session_id]
            await websocket.send_json(message)
    
    async def handle_audio_chunk(self, session_id: str, audio_data_b64: str):
        """Process incoming audio chunk"""
        try:
            # Decode base64 audio
            audio_bytes = base64.b64decode(audio_data_b64)
            
            # Get or create STT service for this session
            if session_id not in self.stt_services:
                stt_service = STTService()
                
                # Define transcript callback
                async def transcript_callback(text: str, speaker: str, confidence: float):
                    await self._process_transcript(session_id, text, speaker, confidence)

                # Define model audio callback
                async def audio_callback(audio_bytes: bytes, mime_type: str):
                    await self.send_message(session_id, {
                        "type": "audio_response",
                        "session_id": session_id,
                        "audio_data": base64.b64encode(audio_bytes).decode("ascii"),
                        "mime_type": mime_type,
                    })
                
                # Start STT stream
                success = await stt_service.start_stream(transcript_callback, audio_callback)
                if success:
                    self.stt_services[session_id] = stt_service
                else:
                    print(f"❌ Failed to start STT service for session: {session_id}")
                    return
            
            # Send audio to STT service
            stt_service = self.stt_services[session_id]
            await stt_service.send_audio(audio_bytes)
            
        except Exception as e:
            print(f"❌ Error handling audio chunk: {e}")
            await self.send_message(session_id, {
                "type": "error",
                "session_id": session_id,
                "error": "Audio processing error",
                "details": str(e)
            })
    
    async def _process_transcript(
        self, 
        session_id: str, 
        text: str, 
        speaker: str,
        confidence: float
    ):
        """Process transcript segment and send to client"""
        try:
            # Map Gemini speaker labels to clinical roles:
            # - "unknown" (user input) → "patient"
            # - "assistant" (model output) → "physician"
            speaker_mapping = {
                "unknown": "patient",
                "assistant": "physician",
                "patient": "patient",
                "physician": "physician"
            }
            normalized_speaker = speaker_mapping.get(speaker, "patient")

            # Create transcript segment
            segment = TranscriptSegment(
                speaker=normalized_speaker,
                text=text,
                timestamp=datetime.now().timestamp(),
                confidence=confidence
            )
            
            # Store in session
            session_manager.add_transcript_segment(session_id, segment)
            
            # Send to client
            await self.send_message(session_id, {
                "type": "transcript",
                "session_id": session_id,
                "segment": {
                    "speaker": segment.speaker,
                    "text": segment.text,
                    "timestamp": segment.timestamp,
                    "confidence": segment.confidence
                }
            })
            
            print(f"📝 Transcript: [{normalized_speaker}] {text}")

            # Auto-generate suggested questions periodically to reduce latency
            # Generate at most once every 7 seconds per session when there is meaningful text
            try:
                now = datetime.now()
                last_questions = self.last_questions_update.get(session_id)
                has_meaningful_text = len(text.strip().split()) >= 3
                if has_meaningful_text and (last_questions is None or (now - last_questions).total_seconds() >= 7):
                    self.last_questions_update[session_id] = now
                    # fire and forget; generation sends questions_response to client
                    await self.handle_request_questions(session_id)
            except Exception as _:
                # Don't fail transcript flow on question generation errors
                pass

            # Auto-generate clinical context periodically to reduce latency
            # Generate at most once every 15 seconds per session when there is meaningful text
            try:
                now = datetime.now()
                last_context = self.last_context_update.get(session_id)
                has_meaningful_text = len(text.strip().split()) >= 3
                if has_meaningful_text and (last_context is None or (now - last_context).total_seconds() >= 15):
                    self.last_context_update[session_id] = now
                    # fire and forget; generation sends context_response to client
                    await self.handle_request_context(session_id)
            except Exception as _:
                # Don't fail transcript flow on context generation errors
                pass
            
        except Exception as e:
            print(f"❌ Error processing transcript: {e}")
    
    async def handle_request_questions(self, session_id: str):
        """Generate and send suggested questions"""
        try:
            session = session_manager.get_session(session_id)
            if not session:
                await self.send_message(session_id, {
                    "type": "error",
                    "session_id": session_id,
                    "error": "Session not found"
                })
                return
            
            # Get full transcript
            transcript = session_manager.get_full_transcript(session_id)
            
            if not transcript.strip():
                await self.send_message(session_id, {
                    "type": "questions_response",
                    "session_id": session_id,
                    "questions": []
                })
                return
            
            # Extract basic clinical context using NLP
            nlp_context = nlp_service.extract_medical_context(transcript)
            
            # Prepare context for LLM
            clinical_context = {
                "chief_complaint": session.clinical_context.chief_complaint or nlp_context.get("chief_complaint"),
                "symptoms": session.clinical_context.symptoms or nlp_context.get("symptoms", []),
                "duration": session.clinical_context.duration or nlp_context.get("duration"),
                "location": session.clinical_context.location,
                "associated_symptoms": session.clinical_context.associated_symptoms
            }
            
            # Get asked questions
            asked_questions = session_manager.get_asked_questions(session_id)
            
            # Generate questions using LLM
            questions = await llm_service.generate_questions(
                conversation_transcript=transcript,
                clinical_context=clinical_context,
                asked_questions=asked_questions
            )
            
            # Store in session
            session_manager.add_suggested_questions(session_id, questions)
            
            # Send to client
            await self.send_message(session_id, {
                "type": "questions_response",
                "session_id": session_id,
                "questions": [
                    {
                        "id": q.id,
                        "question": q.question,
                        "rationale": q.rationale,
                        "priority": q.priority,
                        "category": q.category,
                        "is_asked": q.is_asked,
                        "timestamp": q.timestamp.isoformat()
                    }
                    for q in questions
                ]
            })
            
            print(f"❓ Sent {len(questions)} questions to client")
            
        except Exception as e:
            print(f"❌ Error generating questions: {e}")
            await self.send_message(session_id, {
                "type": "error",
                "session_id": session_id,
                "error": "Question generation error",
                "details": str(e)
            })
    
    async def handle_request_context(self, session_id: str):
        """Extract and send clinical context"""
        try:
            session = session_manager.get_session(session_id)
            if not session:
                await self.send_message(session_id, {
                    "type": "error",
                    "session_id": session_id,
                    "error": "Session not found"
                })
                return
            
            # Get full transcript
            transcript = session_manager.get_full_transcript(session_id)
            
            if not transcript.strip():
                await self.send_message(session_id, {
                    "type": "context_response",
                    "session_id": session_id,
                    "context": session.clinical_context.dict()
                })
                return
            
            # Extract context using both NLP and LLM
            nlp_context = nlp_service.extract_medical_context(transcript)
            llm_context = await llm_service.extract_clinical_context(transcript)
            
            # Merge contexts
            entities = [
                ClinicalEntity(
                    text=e["text"],
                    entity_type=e["entity_type"],
                    start_char=e["start_char"],
                    end_char=e["end_char"]
                )
                for e in nlp_context.get("entities", [])
            ]
            
            context = ClinicalContext(
                chief_complaint=llm_context.get("chief_complaint") or nlp_context.get("chief_complaint"),
                symptoms=llm_context.get("symptoms", []) or nlp_context.get("symptoms", []),
                duration=llm_context.get("duration") or nlp_context.get("duration"),
                location=llm_context.get("location"),
                associated_symptoms=llm_context.get("associated_symptoms", []),
                past_medical_history=llm_context.get("past_medical_history", []),
                medications=llm_context.get("medications", []),
                allergies=llm_context.get("allergies", []),
                entities=entities
            )
            
            # Update session
            session_manager.update_clinical_context(session_id, context)
            
            # Send to client
            await self.send_message(session_id, {
                "type": "context_response",
                "session_id": session_id,
                "context": context.dict()
            })
            
            print(f"🩺 Sent clinical context to client")
            
        except Exception as e:
            print(f"❌ Error extracting context: {e}")
            await self.send_message(session_id, {
                "type": "error",
                "session_id": session_id,
                "error": "Context extraction error",
                "details": str(e)
            })
    
    async def handle_mark_question_asked(self, session_id: str, question_id: str):
        """Mark a question as asked"""
        try:
            success = session_manager.mark_question_asked(session_id, question_id)
            
            if success:
                # Send immediate confirmation to client
                await self.send_message(session_id, {
                    "type": "question_marked_asked",
                    "session_id": session_id,
                    "question_id": question_id
                })
                
                # Automatically generate a new question to replace it
                await self.handle_request_questions(session_id)
            else:
                await self.send_message(session_id, {
                    "type": "error",
                    "session_id": session_id,
                    "error": "Failed to mark question as asked"
                })
        
        except Exception as e:
            print(f"❌ Error marking question: {e}")
            await self.send_message(session_id, {
                "type": "error",
                "session_id": session_id,
                "error": "Error marking question as asked",
                "details": str(e)
            })
    
    async def handle_request_summary(self, session_id: str):
        """Generate and send conversation summary"""
        try:
            session = session_manager.get_session(session_id)
            if not session:
                await self.send_message(session_id, {
                    "type": "error",
                    "session_id": session_id,
                    "error": "Session not found"
                })
                return
            
            # Get transcript and stats
            transcript = session_manager.get_full_transcript(session_id)
            stats = session_manager.get_session_stats(session_id)
            
            # Generate summary
            summary = await llm_service.generate_summary(
                conversation_transcript=transcript,
                duration_minutes=stats["duration_minutes"],
                word_count=stats["word_count"]
            )
            
            if summary:
                await self.send_message(session_id, {
                    "type": "summary_response",
                    "session_id": session_id,
                    "summary": {
                        "chief_complaint": summary.chief_complaint,
                        "key_findings": summary.key_findings,
                        "discussed_topics": summary.discussed_topics,
                        "pending_topics": summary.pending_topics,
                        "duration_minutes": summary.duration_minutes,
                        "word_count": summary.word_count
                    }
                })
                print(f"📊 Sent summary to client")
            else:
                await self.send_message(session_id, {
                    "type": "error",
                    "session_id": session_id,
                    "error": "Failed to generate summary"
                })
        
        except Exception as e:
            print(f"❌ Error generating summary: {e}")
            await self.send_message(session_id, {
                "type": "error",
                "session_id": session_id,
                "error": "Summary generation error",
                "details": str(e)
            })
    
    async def cleanup_session(self, session_id: str):
        """Clean up session resources"""
        # Close STT connection
        if session_id in self.stt_services:
            stt_service = self.stt_services[session_id]
            await stt_service.close()
            del self.stt_services[session_id]
        
        # End session
        session_manager.end_session(session_id)
        
        print(f"🧹 Cleaned up session: {session_id}")


# Global connection manager
manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """Main WebSocket endpoint handler"""
    await manager.connect(websocket, session_id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            message_type = message.get("type")
            
            # Route message to appropriate handler
            if message_type == "audio_chunk":
                await manager.handle_audio_chunk(
                    session_id, 
                    message.get("audio_data")
                )
            
            elif message_type == "request_questions":
                await manager.handle_request_questions(session_id)
            
            elif message_type == "request_context":
                await manager.handle_request_context(session_id)
            
            elif message_type == "mark_question_asked":
                await manager.handle_mark_question_asked(
                    session_id,
                    message.get("question_id")
                )
            
            elif message_type == "request_summary":
                await manager.handle_request_summary(session_id)
            
            elif message_type == "end_session":
                await manager.cleanup_session(session_id)
                break
            
            else:
                print(f"⚠️ Unknown message type: {message_type}")
    
    except WebSocketDisconnect:
        print(f"Client disconnected: {session_id}")
    
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
    
    finally:
        manager.disconnect(session_id)
        await manager.cleanup_session(session_id)
