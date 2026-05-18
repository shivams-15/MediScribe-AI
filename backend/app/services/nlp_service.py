"""Clinical NLP service for entity extraction and context understanding"""
import os
from typing import List, Dict
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    print("⚠️ SpaCy not installed, using basic NLP")


class NLPService:
    """Clinical Natural Language Processing"""
    
    def __init__(self):
        # Load sentence transformer for embeddings
        print("📦 Loading NLP models...")
        self.embedder = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Try to load ScispaCy model
        self.nlp = None
        if SPACY_AVAILABLE:
            try:
                self.nlp = spacy.load("en_ner_bc5cdr_md")
                print("✅ Loaded ScispaCy medical NER model")
            except OSError:
                print("⚠️ ScispaCy model not found. Run: python -m spacy download en_core_web_sm")
                try:
                    self.nlp = spacy.load("en_core_web_sm")
                    print("✅ Loaded basic SpaCy model")
                except:
                    print("⚠️ No SpaCy model available")
        
        # Medical keywords for basic extraction
        self.symptom_keywords = {
            "pain", "ache", "discomfort", "soreness", "tenderness",
            "fever", "chills", "sweating", "nausea", "vomiting",
            "dizziness", "headache", "fatigue", "weakness",
            "shortness of breath", "dyspnea", "cough", "wheezing",
            "chest pain", "abdominal pain", "back pain",
            "rash", "swelling", "bleeding", "discharge"
        }
        
        self.duration_patterns = [
            "hours", "days", "weeks", "months", "years",
            "today", "yesterday", "last week", "last month"
        ]
    
    def extract_entities(self, text: str) -> List[Dict]:
        """Extract medical entities from text"""
        entities = []
        
        if self.nlp:
            doc = self.nlp(text.lower())
            for ent in doc.ents:
                entities.append({
                    "text": ent.text,
                    "entity_type": ent.label_,
                    "start_char": ent.start_char,
                    "end_char": ent.end_char
                })
        else:
            # Fallback: keyword matching
            text_lower = text.lower()
            for keyword in self.symptom_keywords:
                if keyword in text_lower:
                    start = text_lower.find(keyword)
                    entities.append({
                        "text": keyword,
                        "entity_type": "SYMPTOM",
                        "start_char": start,
                        "end_char": start + len(keyword)
                    })
        
        return entities
    
    def extract_symptoms(self, text: str) -> List[str]:
        """Extract symptom mentions"""
        symptoms = []
        text_lower = text.lower()
        
        for symptom in self.symptom_keywords:
            if symptom in text_lower:
                symptoms.append(symptom)
        
        # Use NER if available
        if self.nlp:
            doc = self.nlp(text_lower)
            for ent in doc.ents:
                if ent.label_ in ["DISEASE", "SYMPTOM"]:
                    symptoms.append(ent.text)
        
        return list(set(symptoms))  # Remove duplicates
    
    def extract_duration(self, text: str) -> str:
        """Extract time duration mentions"""
        text_lower = text.lower()
        
        for pattern in self.duration_patterns:
            if pattern in text_lower:
                # Extract surrounding context
                idx = text_lower.find(pattern)
                start = max(0, idx - 20)
                end = min(len(text), idx + len(pattern) + 10)
                return text[start:end].strip()
        
        return ""
    
    def identify_chief_complaint(self, transcript: str) -> str:
        """Identify the chief complaint from transcript"""
        # Look for common patterns
        patterns = [
            "i have", "i'm having", "i feel", "i've been",
            "my", "the problem is", "i came in because"
        ]
        
        sentences = transcript.lower().split('.')
        
        for sentence in sentences[:5]:  # Check first 5 sentences
            for pattern in patterns:
                if pattern in sentence:
                    return sentence.strip()
        
        return sentences[0].strip() if sentences else ""
    
    def compute_similarity(self, text1: str, text2: str) -> float:
        """Compute semantic similarity between two texts"""
        embeddings = self.embedder.encode([text1, text2])
        similarity = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
        return float(similarity)
    
    def check_duplicate_question(
        self, 
        new_question: str, 
        existing_questions: List[str],
        threshold: float = 0.85
    ) -> bool:
        """Check if question is duplicate of existing ones"""
        if not existing_questions:
            return False
        
        new_embedding = self.embedder.encode([new_question])
        existing_embeddings = self.embedder.encode(existing_questions)
        
        similarities = cosine_similarity(new_embedding, existing_embeddings)[0]
        
        return np.max(similarities) > threshold
    
    def extract_medical_context(self, transcript: str) -> Dict:
        """Extract structured medical context from transcript"""
        context = {
            "symptoms": self.extract_symptoms(transcript),
            "duration": self.extract_duration(transcript),
            "chief_complaint": self.identify_chief_complaint(transcript),
            "entities": self.extract_entities(transcript)
        }
        
        return context


# Global NLP service instance
nlp_service = NLPService()
