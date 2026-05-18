"""Main FastAPI application"""
import os
import sys
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Allow running this file directly via `python app/main.py`.
if __package__ is None or __package__ == "":
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables FIRST before any app imports
load_dotenv()

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.models.schemas import (
    GenerateQuestionsRequest,
    GenerateContextRequest,
    GenerateSummaryRequest,
)
from app.websocket_handler import websocket_endpoint
from app.services.session_manager import session_manager
from app.services.llm_service import llm_service

# Create FastAPI app
app = FastAPI(
    title="MediScribe AI API",
    description="Real-time AI clinical documentation assistant",
    version="1.0.0"
)

# Configure CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "MediScribe AI API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "gemini_api_key": "configured" if (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")) else "missing"
    }


@app.get("/api/connection-details")
async def get_connection_details():
    """Create Gemini Live session and return connection details (like veyra-ai)"""
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return JSONResponse(
            status_code=500,
            content={"error": "GEMINI_API_KEY is not set"}
        )
    
    model = os.getenv("GEMINI_LIVE_MODEL", "gemini-3.1-flash-live-preview")
    
    try:
        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(api_version="v1alpha")
        )
        
        now = datetime.now(tz=timezone.utc)
        token = client.auth_tokens.create(
            config={
                "uses": 1,
                "expire_time": now + timedelta(minutes=30),
                "new_session_expire_time": now + timedelta(minutes=1),
            }
        )
        
        return {
            "accessToken": token.name,
            "model": model,
            "wsUrl": "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained"
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to create Gemini session: {str(e)}"}
        )


@app.post("/sessions/create")
async def create_session():
    """Create a new clinical session"""
    session_id = session_manager.create_session()
    return {
        "session_id": session_id,
        "message": "Session created successfully"
    }


@app.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get session information"""
    session = session_manager.get_session(session_id)
    if not session:
        return JSONResponse(
            status_code=404,
            content={"error": "Session not found"}
        )
    
    stats = session_manager.get_session_stats(session_id)
    
    return {
        "session_id": session.session_id,
        "start_time": session.start_time.isoformat(),
        "is_active": session.is_active,
        "stats": stats
    }


@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session"""
    success = session_manager.delete_session(session_id)
    if success:
        return {"message": "Session deleted successfully"}
    else:
        return JSONResponse(
            status_code=404,
            content={"error": "Session not found"}
        )


@app.get("/sessions/{session_id}/transcript")
async def get_transcript(session_id: str):
    """Get session transcript"""
    session = session_manager.get_session(session_id)
    if not session:
        return JSONResponse(
            status_code=404,
            content={"error": "Session not found"}
        )
    
    return {
        "session_id": session_id,
        "transcript": [
            {
                "speaker": seg.speaker,
                "text": seg.text,
                "timestamp": seg.timestamp,
                "confidence": seg.confidence
            }
            for seg in session.transcript
        ]
    }


@app.post("/sessions/{session_id}/questions")
async def generate_questions(session_id: str, request: GenerateQuestionsRequest):
    """Generate suggested diagnostic questions based on conversation"""
    
    # Build conversation transcript from request
    transcript_text = "\n".join([
        f"{seg.speaker}: {seg.text}" 
        for seg in request.transcript
    ])
    
    if not transcript_text.strip():
        return JSONResponse(
            status_code=400,
            content={"error": "No transcript provided"}
        )
    
    # Extract clinical context first (needed for question generation)
    clinical_context = await llm_service.extract_clinical_context(transcript_text)
    
    # Generate questions (no asked questions tracking for now)
    questions = await llm_service.generate_questions(
        conversation_transcript=transcript_text,
        clinical_context=clinical_context,
        asked_questions=[]
    )
    
    return {
        "session_id": session_id,
        "questions": [q.model_dump() for q in questions]
    }


@app.post("/sessions/{session_id}/context")
async def extract_context(session_id: str, request: GenerateContextRequest):
    """Extract clinical context from conversation"""
    
    # Build conversation transcript from request
    transcript_text = "\n".join([
        f"{seg.speaker}: {seg.text}" 
        for seg in request.transcript
    ])
    
    if not transcript_text.strip():
        return JSONResponse(
            status_code=400,
            content={"error": "No transcript provided"}
        )
    
    # Extract clinical context
    context = await llm_service.extract_clinical_context(transcript_text)
    
    return {
        "session_id": session_id,
        "context": context
    }


@app.post("/sessions/{session_id}/summary")
async def generate_summary(session_id: str, request: GenerateSummaryRequest):
    """Generate conversation summary"""
    
    # Build conversation transcript from request
    transcript_text = "\n".join([
        f"{seg.speaker}: {seg.text}" 
        for seg in request.transcript
    ])
    
    if not transcript_text.strip():
        return JSONResponse(
            status_code=400,
            content={"error": "No transcript provided"}
        )
    
    # Calculate stats
    word_count = len(transcript_text.split())
    
    # Calculate duration from first to last timestamp if available
    if request.transcript:
        duration_seconds = request.transcript[-1].timestamp - request.transcript[0].timestamp
        duration_minutes = duration_seconds / 60
    else:
        duration_minutes = 0
    
    # Generate summary
    summary = await llm_service.generate_summary(
        conversation_transcript=transcript_text,
        duration_minutes=duration_minutes,
        word_count=word_count
    )
    
    if not summary:
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to generate summary"}
        )
    
    return {
        "session_id": session_id,
        "summary": summary.model_dump()
    }


@app.websocket("/ws/{session_id}")
async def websocket_route(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time communication"""
    await websocket_endpoint(websocket, session_id)


if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    
    print(f"""
    ╔══════════════════════════════════════════╗
    ║   MediScribe AI API Server               ║
    ║                                          ║
    ║   🚀 Starting server...                  ║
    ║   📍 http://{host}:{port}            ║
    ║   📚 Docs: http://{host}:{port}/docs  ║
    ╚══════════════════════════════════════════╝
    """)
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )
