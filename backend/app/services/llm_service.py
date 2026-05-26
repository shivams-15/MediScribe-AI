"""LLM service for question generation and clinical reasoning"""
import os
import json
from typing import List, Dict, Optional, Any
import uuid
import asyncio
import re
from google import genai
from google.genai import types

from app.models.schemas import SuggestedQuestion, ConversationSummary
from app.models.prompts import (
    QUESTION_GENERATION_PROMPT,
    CONTEXT_EXTRACTION_PROMPT,
    SUMMARY_GENERATION_PROMPT,
    SYSTEM_PROMPT
)


class LLMService:
    """Gemini service for clinical reasoning"""
    
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY not found in environment")
        
        self.client = genai.Client(api_key=self.api_key).aio
        self.model = model or os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
        model_fallbacks_raw = os.getenv(
            "GEMINI_MODEL_FALLBACKS",
            "gemini-2.0-flash,gemini-2.5-flash",
        )
        self.models = self._dedupe_preserve_order(
            [self.model] + [m.strip() for m in model_fallbacks_raw.split(",") if m.strip()]
        )
        self.summary_model = os.getenv("GEMINI_SUMMARY_MODEL", "gemini-3.5-flash")
        summary_fallbacks_raw = os.getenv(
            "GEMINI_SUMMARY_MODEL_FALLBACKS",
            "gemini-2.0-flash,gemini-2.5-flash",
        )
        self.summary_models = self._dedupe_preserve_order(
            [self.summary_model] + [m.strip() for m in summary_fallbacks_raw.split(",") if m.strip()]
        )
        self.temperature = float(os.getenv("TEMPERATURE", "0.7"))
        self.max_tokens = int(os.getenv("MAX_TOKENS", "2000"))
        
        print(
            f"✅ LLM Service initialized with base model: {self.model}, "
            f"summary model: {self.summary_model}"
        )

    @staticmethod
    def _dedupe_preserve_order(items: List[str]) -> List[str]:
        seen = set()
        result = []
        for item in items:
            if item not in seen:
                seen.add(item)
                result.append(item)
        return result

    @staticmethod
    def _is_quota_or_rate_limit_error(error: Exception) -> bool:
        message = str(error)
        upper_message = message.upper()
        return (
            "RESOURCE_EXHAUSTED" in upper_message
            or "429" in message
            or "RATE LIMIT" in upper_message
            or "QUOTA" in upper_message
        )

    def _extract_balanced_json(self, text: str, start_idx: int) -> Optional[str]:
        """Extract the first balanced JSON object/array from text starting at start_idx."""
        if start_idx < 0 or start_idx >= len(text):
            return None

        opener = text[start_idx]
        if opener not in "[{":
            return None
        closer = "}" if opener == "{" else "]"

        depth = 0
        in_string = False
        escape = False

        for i in range(start_idx, len(text)):
            ch = text[i]

            if in_string:
                if escape:
                    escape = False
                elif ch == "\\":
                    escape = True
                elif ch == '"':
                    in_string = False
                continue

            if ch == '"':
                in_string = True
                continue

            if ch == opener:
                depth += 1
            elif ch == closer:
                depth -= 1
                if depth == 0:
                    return text[start_idx : i + 1]

        return None

    def _parse_json_response(self, content: str) -> Any:
        """Parse model output robustly, handling markdown fences and wrapper text."""
        cleaned = content.strip()
        if not cleaned:
            return None

        # Remove common markdown code fences while preserving JSON body.
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)

        direct_candidates = [cleaned]
        if cleaned.lower().startswith("json\n"):
            direct_candidates.append(cleaned[5:].strip())

        for candidate in direct_candidates:
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                pass

        # Try extracting the first balanced JSON object/array from wrapper text.
        starts = [idx for idx, ch in enumerate(cleaned) if ch in "[{"]
        for idx in starts:
            block = self._extract_balanced_json(cleaned, idx)
            if not block:
                continue
            try:
                return json.loads(block)
            except json.JSONDecodeError:
                continue

        raise ValueError("Could not parse valid JSON from model response")

    async def _generate_json(
        self,
        prompt: str,
        response_schema: Dict[str, Any],
        temperature: float,
        max_tokens: int,
        model: Optional[str] = None,
    ) -> Any:
        """Generate structured JSON using Gemini with strict JSON response MIME type."""
        candidate_models = [model] if model else self.models
        if model and model == self.summary_model:
            candidate_models = self.summary_models

        last_error: Optional[Exception] = None

        for idx, candidate_model in enumerate(candidate_models):
            try:
                response = await self.client.models.generate_content(
                    model=candidate_model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        temperature=temperature,
                        max_output_tokens=max_tokens,
                        response_mime_type="application/json",
                        response_json_schema=response_schema,
                    ),
                )

                if response.parsed is not None:
                    if candidate_model != self.model:
                        print(f"✅ LLM request succeeded using fallback model: {candidate_model}")
                    return response.parsed

                content = (response.text or "").strip()
                if not content:
                    return None

                parsed = self._parse_json_response(content)
                if candidate_model != self.model:
                    print(f"✅ LLM request succeeded using fallback model: {candidate_model}")
                return parsed
            except Exception as error:
                last_error = error
                can_retry_with_next_model = (
                    idx < len(candidate_models) - 1 and self._is_quota_or_rate_limit_error(error)
                )
                if can_retry_with_next_model:
                    next_model = candidate_models[idx + 1]
                    print(
                        f"⚠️ Model {candidate_model} hit quota/rate limit. "
                        f"Retrying with {next_model}."
                    )
                    continue
                raise

        if last_error:
            raise last_error
        return None
    
    async def generate_questions(
        self,
        conversation_transcript: str,
        clinical_context: Dict,
        asked_questions: List[str]
    ) -> List[SuggestedQuestion]:
        """Generate relevant diagnostic questions"""
        
        # Format the prompt
        prompt = QUESTION_GENERATION_PROMPT.format(
            conversation_transcript=conversation_transcript,
            chief_complaint=clinical_context.get("chief_complaint", "Not identified"),
            symptoms=", ".join(clinical_context.get("symptoms", [])) or "None mentioned",
            duration=clinical_context.get("duration", "Not specified"),
            location=clinical_context.get("location", "Not specified"),
            associated_symptoms=", ".join(clinical_context.get("associated_symptoms", [])) or "None",
            asked_questions="\n".join(f"- {q}" for q in asked_questions) or "None yet"
        )
        
        try:
            questions_schema = {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "question": {"type": "string"},
                        "rationale": {"type": "string"},
                        "priority": {"type": "integer"},
                        "category": {"type": "string"},
                    },
                    "required": ["question", "rationale", "priority", "category"],
                },
            }

            parsed = await self._generate_json(
                prompt=prompt,
                response_schema=questions_schema,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
            )

            if isinstance(parsed, list):
                questions_data = parsed
            elif isinstance(parsed, dict):
                questions_data = parsed.get("questions", [])
            else:
                questions_data = []
            
            # Convert to SuggestedQuestion objects
            questions = []
            for q_data in questions_data:
                question = SuggestedQuestion(
                    id=str(uuid.uuid4()),
                    question=q_data.get("question", ""),
                    rationale=q_data.get("rationale", ""),
                    priority=q_data.get("priority", 5),
                    category=q_data.get("category", "HPI"),
                    is_asked=False
                )
                questions.append(question)
            
            print(f"✅ Generated {len(questions)} questions")
            return questions
            
        except Exception as e:
            print(f"❌ Error generating questions: {e}")
            return []
    
    async def extract_clinical_context(
        self,
        conversation_transcript: str
    ) -> Dict:
        """Extract structured clinical context from conversation"""
        
        prompt = CONTEXT_EXTRACTION_PROMPT.format(
            conversation_transcript=conversation_transcript
        )
        
        try:
            context_schema = {
                "type": "object",
                "properties": {
                    "chief_complaint": {"type": ["string", "null"]},
                    "symptoms": {"type": "array", "items": {"type": "string"}},
                    "duration": {"type": ["string", "null"]},
                    "location": {"type": ["string", "null"]},
                    "associated_symptoms": {"type": "array", "items": {"type": "string"}},
                    "past_medical_history": {"type": "array", "items": {"type": "string"}},
                    "medications": {"type": "array", "items": {"type": "string"}},
                    "allergies": {"type": "array", "items": {"type": "string"}},
                },
                "required": [
                    "chief_complaint",
                    "symptoms",
                    "duration",
                    "location",
                    "associated_symptoms",
                    "past_medical_history",
                    "medications",
                    "allergies",
                ],
            }

            context = await self._generate_json(
                prompt=prompt,
                response_schema=context_schema,
                temperature=0.3,
                max_tokens=1000,
            )
            if not isinstance(context, dict):
                return {}
            
            print(f"✅ Extracted clinical context")
            return context
            
        except Exception as e:
            print(f"❌ Error extracting context: {e}")
            return {}
    
    async def generate_summary(
        self,
        conversation_transcript: str,
        duration_minutes: float,
        word_count: int
    ) -> Optional[ConversationSummary]:
        """Generate conversation summary"""
        
        prompt = SUMMARY_GENERATION_PROMPT.format(
            conversation_transcript=conversation_transcript,
            duration_minutes=duration_minutes,
            word_count=word_count
        )
        
        try:
            summary_schema = {
                "type": "object",
                "properties": {
                    "chief_complaint": {"type": "string"},
                    "key_findings": {"type": "array", "items": {"type": "string"}},
                    "discussed_topics": {"type": "array", "items": {"type": "string"}},
                    "pending_topics": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["chief_complaint", "key_findings", "discussed_topics", "pending_topics"],
            }

            summary_data = await self._generate_json(
                prompt=prompt,
                response_schema=summary_schema,
                temperature=0.5,
                max_tokens=1000,
                model=self.summary_model,
            )
            if not isinstance(summary_data, dict):
                return None
            
            summary = ConversationSummary(
                chief_complaint=summary_data.get("chief_complaint", ""),
                key_findings=summary_data.get("key_findings", []),
                discussed_topics=summary_data.get("discussed_topics", []),
                pending_topics=summary_data.get("pending_topics", []),
                duration_minutes=duration_minutes,
                word_count=word_count
            )
            
            print(f"✅ Generated conversation summary")
            return summary
            
        except Exception as e:
            print(f"❌ Error generating summary: {e}")
            return None


# Global LLM service instance
llm_service = LLMService()
