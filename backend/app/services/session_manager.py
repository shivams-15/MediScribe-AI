"""In-memory session management for POC"""
from typing import Dict, Optional
from datetime import datetime
import uuid

from app.models.schemas import (
    SessionState,
    TranscriptSegment,
    SuggestedQuestion,
    ClinicalContext
)


class SessionManager:
    """Manages active clinical sessions in memory"""
    
    def __init__(self):
        self.sessions: Dict[str, SessionState] = {}
    
    def create_session(self) -> str:
        """Create a new session and return session ID"""
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = SessionState(
            session_id=session_id,
            start_time=datetime.now(),
            is_active=True
        )
        print(f"✅ Created session: {session_id}")
        return session_id
    
    def get_session(self, session_id: str) -> Optional[SessionState]:
        """Retrieve a session by ID"""
        return self.sessions.get(session_id)
    
    def add_transcript_segment(
        self, 
        session_id: str, 
        segment: TranscriptSegment
    ) -> bool:
        """Add a transcript segment to session"""
        session = self.get_session(session_id)
        if session:
            session.transcript.append(segment)
            return True
        return False
    
    def get_full_transcript(self, session_id: str) -> str:
        """Get complete transcript as formatted string"""
        session = self.get_session(session_id)
        if not session:
            return ""
        
        transcript_lines = []
        for segment in session.transcript:
            speaker_label = "👨‍⚕️ Physician" if segment.speaker == "physician" else "👤 Patient"
            transcript_lines.append(f"{speaker_label}: {segment.text}")
        
        return "\n".join(transcript_lines)
    
    def update_clinical_context(
        self, 
        session_id: str, 
        context: ClinicalContext
    ) -> bool:
        """Update clinical context for session"""
        session = self.get_session(session_id)
        if session:
            session.clinical_context = context
            return True
        return False
    
    def add_suggested_questions(
        self, 
        session_id: str, 
        questions: list[SuggestedQuestion]
    ) -> bool:
        """Replace suggested questions for session"""
        session = self.get_session(session_id)
        if session:
            # Filter out questions that have been asked
            new_questions = [
                q for q in questions 
                if q.question not in session.asked_questions
            ]
            session.suggested_questions = new_questions
            return True
        return False
    
    def mark_question_asked(
        self, 
        session_id: str, 
        question_id: str
    ) -> bool:
        """Mark a question as asked and remove it"""
        session = self.get_session(session_id)
        if not session:
            return False
        
        # Find and mark the question
        for question in session.suggested_questions:
            if question.id == question_id:
                question.is_asked = True
                session.asked_questions.append(question.question)
                # Remove from suggested list
                session.suggested_questions = [
                    q for q in session.suggested_questions 
                    if q.id != question_id
                ]
                return True
        
        return False
    
    def get_asked_questions(self, session_id: str) -> list[str]:
        """Get list of questions already asked"""
        session = self.get_session(session_id)
        if session:
            return session.asked_questions
        return []
    
    def end_session(self, session_id: str) -> bool:
        """Mark session as ended"""
        session = self.get_session(session_id)
        if session:
            session.is_active = False
            return True
        return False
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a session from memory"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            print(f"🗑️ Deleted session: {session_id}")
            return True
        return False
    
    def get_session_stats(self, session_id: str) -> dict:
        """Get session statistics"""
        session = self.get_session(session_id)
        if not session:
            return {}
        
        duration = (datetime.now() - session.start_time).total_seconds() / 60
        word_count = sum(len(seg.text.split()) for seg in session.transcript)
        
        return {
            "duration_minutes": round(duration, 2),
            "word_count": word_count,
            "segment_count": len(session.transcript),
            "questions_asked": len(session.asked_questions)
        }


# Global session manager instance
session_manager = SessionManager()
