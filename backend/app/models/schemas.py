from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime


class TranscriptSegment(BaseModel):
    """Individual transcript segment with speaker information"""
    speaker: Literal["physician", "patient", "unknown"]
    text: str
    timestamp: float
    confidence: Optional[float] = None


class ClinicalEntity(BaseModel):
    """Extracted medical entity"""
    text: str
    entity_type: str  # disease, symptom, medication, procedure, etc.
    start_char: int
    end_char: int


class ClinicalContext(BaseModel):
    """Structured clinical context from conversation"""
    chief_complaint: Optional[str] = None
    symptoms: List[str] = Field(default_factory=list)
    duration: Optional[str] = None
    location: Optional[str] = None
    associated_symptoms: List[str] = Field(default_factory=list)
    past_medical_history: List[str] = Field(default_factory=list)
    medications: List[str] = Field(default_factory=list)
    allergies: List[str] = Field(default_factory=list)
    entities: List[ClinicalEntity] = Field(default_factory=list)


class SuggestedQuestion(BaseModel):
    """A suggested diagnostic question"""
    id: str
    question: str
    rationale: str
    priority: int = Field(ge=1, le=10)
    category: str  # "HPI", "ROS", "PMH", "Medications", "Allergies", "Social"
    is_asked: bool = False
    timestamp: datetime = Field(default_factory=datetime.now)


class ConversationSummary(BaseModel):
    """Summary of the conversation"""
    chief_complaint: str
    key_findings: List[str]
    discussed_topics: List[str]
    pending_topics: List[str]
    duration_minutes: float
    word_count: int


class SessionState(BaseModel):
    """Complete session state"""
    session_id: str
    start_time: datetime
    transcript: List[TranscriptSegment] = Field(default_factory=list)
    clinical_context: ClinicalContext = Field(default_factory=ClinicalContext)
    suggested_questions: List[SuggestedQuestion] = Field(default_factory=list)
    asked_questions: List[str] = Field(default_factory=list)
    is_active: bool = True


# WebSocket message types
class WSMessage(BaseModel):
    """Base WebSocket message"""
    type: str
    session_id: str


class AudioChunkMessage(WSMessage):
    """Audio data from client"""
    type: Literal["audio_chunk"] = "audio_chunk"
    audio_data: str  # base64 encoded


class TranscriptMessage(WSMessage):
    """Transcript update to client"""
    type: Literal["transcript"] = "transcript"
    segment: TranscriptSegment


class QuestionsRequestMessage(WSMessage):
    """Request for suggested questions"""
    type: Literal["request_questions"] = "request_questions"


class QuestionsResponseMessage(WSMessage):
    """Suggested questions response"""
    type: Literal["questions_response"] = "questions_response"
    questions: List[SuggestedQuestion]


class ContextRequestMessage(WSMessage):
    """Request for clinical context"""
    type: Literal["request_context"] = "request_context"


# API Request/Response models
class GenerateQuestionsRequest(BaseModel):
    """Request body for generating questions"""
    transcript: List[TranscriptSegment]


class GenerateContextRequest(BaseModel):
    """Request body for extracting clinical context"""
    transcript: List[TranscriptSegment]


class GenerateSummaryRequest(BaseModel):
    """Request body for generating summary"""
    transcript: List[TranscriptSegment]


class ContextResponseMessage(WSMessage):
    """Clinical context response"""
    type: Literal["context_response"] = "context_response"
    context: ClinicalContext


class MarkQuestionAskedMessage(WSMessage):
    """Mark a question as asked"""
    type: Literal["mark_question_asked"] = "mark_question_asked"
    question_id: str


class SummaryRequestMessage(WSMessage):
    """Request for conversation summary"""
    type: Literal["request_summary"] = "request_summary"


class SummaryResponseMessage(WSMessage):
    """Summary response"""
    type: Literal["summary_response"] = "summary_response"
    summary: ConversationSummary


class ErrorMessage(WSMessage):
    """Error message"""
    type: Literal["error"] = "error"
    error: str
    details: Optional[str] = None
