# MediScribe AI - Backend

Real-time AI assistant backend for physician-patient conversations using FastAPI and Gemini.

## 🏗️ Architecture

- **FastAPI**: Web framework with WebSocket support
- **Gemini Live API**: Real-time speech-to-text via low-latency streaming
- **Gemini API**: Clinical reasoning and question generation
- **ScispaCy**: Medical entity recognition
- **In-memory storage**: Session management (POC)

## 📋 Prerequisites

- Python 3.10 or higher
- Gemini API key ([Get it here](https://aistudio.google.com/apikey))

## 🚀 Setup Instructions

### 1. Create Virtual Environment

```powershell
# Navigate to backend folder
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1
```

### 2. Install Dependencies

```powershell
pip install -r requirements.txt
```

### 3. Download SpaCy Model (Optional but Recommended)

```powershell
# For basic NER
python -m spacy download en_core_web_sm

# For medical NER (better results)
pip install https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/releases/v0.5.4/en_ner_bc5cdr_md-0.5.4.tar.gz
```

### 4. Configure Environment Variables

```powershell
# Copy example env file
copy .env.example .env

# Edit .env and add your API keys
notepad .env
```

Required variables:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 5. Run the Server

```powershell
# Development mode with auto-reload
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or use the main file directly
python app/main.py
```

The server will start at `http://localhost:8000`

## 📚 API Endpoints

### HTTP Endpoints

- `GET /` - Root endpoint
- `GET /health` - Health check (shows API key status)
- `POST /sessions/create` - Create new session
- `GET /sessions/{session_id}` - Get session info
- `DELETE /sessions/{session_id}` - Delete session
- `GET /sessions/{session_id}/transcript` - Get transcript

### WebSocket Endpoint

- `WS /ws/{session_id}` - Real-time bidirectional communication

## 🔌 WebSocket Protocol

### Client → Server Messages

**1. Audio Chunk**
```json
{
  "type": "audio_chunk",
  "session_id": "uuid",
  "audio_data": "base64_encoded_audio"
}
```

**2. Request Questions**
```json
{
  "type": "request_questions",
  "session_id": "uuid"
}
```

**3. Request Context**
```json
{
  "type": "request_context",
  "session_id": "uuid"
}
```

**4. Mark Question Asked**
```json
{
  "type": "mark_question_asked",
  "session_id": "uuid",
  "question_id": "uuid"
}
```

**5. Request Summary**
```json
{
  "type": "request_summary",
  "session_id": "uuid"
}
```

**6. End Session**
```json
{
  "type": "end_session",
  "session_id": "uuid"
}
```

### Server → Client Messages

**1. Transcript Update**
```json
{
  "type": "transcript",
  "session_id": "uuid",
  "segment": {
    "speaker": "physician|patient|unknown",
    "text": "transcript text",
    "timestamp": 1234567890.123,
    "confidence": 0.95
  }
}
```

**2. Questions Response**
```json
{
  "type": "questions_response",
  "session_id": "uuid",
  "questions": [
    {
      "id": "uuid",
      "question": "Question text?",
      "rationale": "Why this matters",
      "priority": 8,
      "category": "HPI",
      "is_asked": false,
      "timestamp": "2025-10-10T12:00:00"
    }
  ]
}
```

**3. Context Response**
```json
{
  "type": "context_response",
  "session_id": "uuid",
  "context": {
    "chief_complaint": "Chest pain",
    "symptoms": ["chest pain", "shortness of breath"],
    "duration": "2 hours",
    "location": "Left chest",
    "associated_symptoms": ["nausea"],
    "past_medical_history": [],
    "medications": [],
    "allergies": []
  }
}
```

**4. Summary Response**
```json
{
  "type": "summary_response",
  "session_id": "uuid",
  "summary": {
    "chief_complaint": "Brief statement",
    "key_findings": ["Finding 1", "Finding 2"],
    "discussed_topics": ["Topic 1", "Topic 2"],
    "pending_topics": ["Topic 1"],
    "duration_minutes": 12.5,
    "word_count": 450
  }
}
```

**5. Error**
```json
{
  "type": "error",
  "session_id": "uuid",
  "error": "Error message",
  "details": "Optional details"
}
```

## 🔧 Configuration

Edit `.env` to configure:

```env
# API Keys
GEMINI_API_KEY=your_key

# Server
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Model Settings
GEMINI_MODEL=gemini-2.5-flash
GEMINI_LIVE_MODEL=gemini-2.0-flash-live-001
TEMPERATURE=0.7
MAX_TOKENS=2000

# Session Settings
MAX_SESSION_DURATION_MINUTES=120
AUTO_REFRESH_INTERVAL_SECONDS=60
```

## 🧪 Testing

### Test Health Endpoint
```powershell
curl http://localhost:8000/health
```

### Create Session
```powershell
curl -X POST http://localhost:8000/sessions/create
```

### Test WebSocket (using websocat)
```powershell
# Install websocat first: scoop install websocat
websocat ws://localhost:8000/ws/YOUR_SESSION_ID
```

## 📁 Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── websocket_handler.py    # WebSocket logic
│   ├── services/
│   │   ├── stt_service.py      # Gemini Live integration
│   │   ├── llm_service.py      # Gemini text generation integration
│   │   ├── nlp_service.py      # Clinical NLP
│   │   └── session_manager.py  # Session management
│   ├── models/
│   │   ├── schemas.py          # Pydantic models
│   │   └── prompts.py          # LLM prompts
│   └── utils/
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

## 🐛 Troubleshooting

### Import Errors
```powershell
# Make sure virtual environment is activated
.\venv\Scripts\Activate.ps1

# Reinstall dependencies
pip install -r requirements.txt
```

### SpaCy Model Not Found
```powershell
python -m spacy download en_core_web_sm
```

### Gemini Live Connection Issues
- Check API key is correct
- Verify internet connection
- Check firewall settings

### Gemini API Errors
- Verify API key has credits
- Check rate limits
- Ensure model access (gemini-2.5-flash and gemini-2.0-flash-live-001)

## 📝 Notes

- **POC Limitation**: Sessions are stored in memory and will be lost on restart
- **Audio Format**: Expects 16kHz, mono, PCM audio
- **Latency**: End-to-end ~1-2 seconds (audio → question display)
- **Context Window**: Maintains full conversation (up to 50K tokens)

## 🔐 Security Notes

- Never commit `.env` file
- Keep API keys secure
- Use HTTPS in production
- Implement authentication for production use
- Add rate limiting for production

## 📞 Support

For issues or questions:
- Check API key configuration in `/health` endpoint
- Review console logs for error messages
- Verify all dependencies are installed

---

**Ready to run!** Start the server and connect your frontend client.
