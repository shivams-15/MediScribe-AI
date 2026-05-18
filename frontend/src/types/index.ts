// Type definitions for MediScribe AI

export type Speaker = "physician" | "patient" | "unknown";

export interface TranscriptSegment {
  speaker: Speaker;
  text: string;
  timestamp: number;
  confidence?: number;
}

export interface ClinicalEntity {
  text: string;
  entity_type: string;
  start_char: number;
  end_char: number;
}

export interface ClinicalContext {
  chief_complaint: string | null;
  symptoms: string[];
  duration: string | null;
  location: string | null;
  associated_symptoms: string[];
  past_medical_history: string[];
  medications: string[];
  allergies: string[];
  entities: ClinicalEntity[];
}

export interface SuggestedQuestion {
  id: string;
  question: string;
  rationale: string;
  priority: number;
  category: string;
  is_asked: boolean;
  timestamp: string;
}

export interface ConversationSummary {
  chief_complaint: string;
  key_findings: string[];
  discussed_topics: string[];
  pending_topics: string[];
  duration_minutes: number;
  word_count: number;
}

// WebSocket message types
export interface WSMessage {
  type: string;
  session_id: string;
}

export interface AudioChunkMessage extends WSMessage {
  type: "audio_chunk";
  audio_data: string;
}

export interface TranscriptMessage extends WSMessage {
  type: "transcript";
  segment: TranscriptSegment;
}

export interface AudioResponseMessage extends WSMessage {
  type: "audio_response";
  audio_data: string;
  mime_type: string;
}

export interface QuestionsResponseMessage extends WSMessage {
  type: "questions_response";
  questions: SuggestedQuestion[];
}

export interface ContextResponseMessage extends WSMessage {
  type: "context_response";
  context: ClinicalContext;
}

export interface SummaryResponseMessage extends WSMessage {
  type: "summary_response";
  summary: ConversationSummary;
}

export interface QuestionMarkedAskedMessage extends WSMessage {
  type: "question_marked_asked";
  question_id: string;
}

export interface ErrorMessage extends WSMessage {
  type: "error";
  error: string;
  details?: string;
}

export type WSIncomingMessage =
  | TranscriptMessage
  | AudioResponseMessage
  | QuestionsResponseMessage
  | ContextResponseMessage
  | SummaryResponseMessage
  | QuestionMarkedAskedMessage
  | ErrorMessage;
