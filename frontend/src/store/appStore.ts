import { create } from "zustand";
import type {
  TranscriptSegment,
  SuggestedQuestion,
  ClinicalContext,
  ConversationSummary,
} from "../types";

interface AppState {
  // Session
  sessionId: string | null;
  isRecording: boolean;
  sessionStartTime: Date | null;

  // Transcript
  transcript: TranscriptSegment[];

  // Questions
  suggestedQuestions: SuggestedQuestion[];
  isLoadingQuestions: boolean;

  // Clinical Context
  clinicalContext: ClinicalContext | null;
  isLoadingContext: boolean;

  // Summary
  summary: ConversationSummary | null;
  isLoadingSummary: boolean;
  showSummaryModal: boolean;

  // WebSocket
  isConnected: boolean;
  error: string | null;

  // Actions
  setSessionId: (id: string | null) => void;
  setIsRecording: (recording: boolean) => void;
  setSessionStartTime: (time: Date | null) => void;

  addTranscriptSegment: (segment: TranscriptSegment) => void;
  updateLastSegment: (speaker: string, text: string) => void;
  clearTranscript: () => void;

  setSuggestedQuestions: (questions: SuggestedQuestion[]) => void;
  removeQuestion: (questionId: string) => void;
  markQuestionAsAsked: (questionId: string) => void;
  setIsLoadingQuestions: (loading: boolean) => void;

  setClinicalContext: (context: ClinicalContext) => void;
  setIsLoadingContext: (loading: boolean) => void;

  setSummary: (summary: ConversationSummary | null) => void;
  setIsLoadingSummary: (loading: boolean) => void;
  setShowSummaryModal: (show: boolean) => void;

  setIsConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;

  reset: () => void;
}

const initialState = {
  sessionId: null,
  isRecording: false,
  sessionStartTime: null,
  transcript: [],
  suggestedQuestions: [],
  isLoadingQuestions: false,
  clinicalContext: null,
  isLoadingContext: false,
  summary: null,
  isLoadingSummary: false,
  showSummaryModal: false,
  isConnected: false,
  error: null,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setSessionId: (id) => set({ sessionId: id }),

  setIsRecording: (recording) => set({ isRecording: recording }),

  setSessionStartTime: (time) => set({ sessionStartTime: time }),

  addTranscriptSegment: (segment) =>
    set((state) => {
      // Check if this is an update to the most recent segment of the same speaker
      const last = state.transcript[state.transcript.length - 1];
      if (last && last.speaker === segment.speaker && segment.timestamp - last.timestamp < 8) {
        // Update existing segment
        const updated = [...state.transcript];
        updated[updated.length - 1] = segment;
        return { transcript: updated };
      }
      // Add new segment
      return { transcript: [...state.transcript, segment] };
    }),

  updateLastSegment: (speaker, text) =>
    set((state) => {
      const last = state.transcript[state.transcript.length - 1];
      if (last && last.speaker === speaker) {
        const updated = [...state.transcript];
        updated[updated.length - 1] = { ...last, text };
        return { transcript: updated };
      }
      return state;
    }),

  clearTranscript: () => set({ transcript: [] }),

  setSuggestedQuestions: (questions) => set({ suggestedQuestions: questions }),

  removeQuestion: (questionId) =>
    set((state) => ({
      suggestedQuestions: state.suggestedQuestions.filter(
        (q) => q.id !== questionId
      ),
    })),

  markQuestionAsAsked: (questionId) =>
    set((state) => ({
      suggestedQuestions: state.suggestedQuestions.map((q) =>
        q.id === questionId ? { ...q, is_asked: true } : q
      ),
    })),

  setIsLoadingQuestions: (loading) => set({ isLoadingQuestions: loading }),

  setClinicalContext: (context) => set({ clinicalContext: context }),

  setIsLoadingContext: (loading) => set({ isLoadingContext: loading }),

  setSummary: (summary) => set({ summary }),

  setIsLoadingSummary: (loading) => set({ isLoadingSummary: loading }),

  setShowSummaryModal: (show) => set({ showSummaryModal: show }),

  setIsConnected: (connected) => set({ isConnected: connected }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));
