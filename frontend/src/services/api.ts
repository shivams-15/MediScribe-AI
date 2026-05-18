import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';

// HTTP API Client
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API Functions
export const api = {
  // Health check
  healthCheck: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  },

  // Session management
  createSession: async () => {
    const response = await apiClient.post('/sessions/create');
    return response.data;
  },

  getSession: async (sessionId: string) => {
    const response = await apiClient.get(`/sessions/${sessionId}`);
    return response.data;
  },

  deleteSession: async (sessionId: string) => {
    const response = await apiClient.delete(`/sessions/${sessionId}`);
    return response.data;
  },

  getTranscript: async (sessionId: string) => {
    const response = await apiClient.get(`/sessions/${sessionId}/transcript`);
    return response.data;
  },

  // AI-powered features
  generateQuestions: async (sessionId: string, transcript: any[]) => {
    const response = await apiClient.post(`/sessions/${sessionId}/questions`, {
      transcript
    });
    return response.data;
  },

  extractContext: async (sessionId: string, transcript: any[]) => {
    const response = await apiClient.post(`/sessions/${sessionId}/context`, {
      transcript
    });
    return response.data;
  },

  generateSummary: async (sessionId: string, transcript: any[]) => {
    const response = await apiClient.post(`/sessions/${sessionId}/summary`, {
      transcript
    });
    return response.data;
  },

  // Gemini Live connection details
  getConnectionDetails: async () => {
    const response = await apiClient.get('/api/connection-details');
    return response.data;
  },
};

// WebSocket connection helper
export const createWebSocketConnection = (sessionId: string): WebSocket => {
  const wsUrl = `${WS_BASE_URL}/ws/${sessionId}`;
  const ws = new WebSocket(wsUrl);
  return ws;
};

export { API_BASE_URL, WS_BASE_URL };
