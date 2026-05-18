import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "../store/appStore";
import { createWebSocketConnection } from "../services/api";
import type { WSIncomingMessage } from "../types";

export const useWebSocket = (sessionId: string | null) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | undefined>(undefined);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const nextPlaybackTimeRef = useRef(0);
  const audioBufferQueueRef = useRef<{data: string, mime: string}[]>([]);
  const isPlayingRef = useRef(false);

  const {
    setIsConnected,
    setError,
    addTranscriptSegment,
    setSuggestedQuestions,
    setIsLoadingQuestions,
    setClinicalContext,
    setIsLoadingContext,
    setSummary,
    setIsLoadingSummary,
    markQuestionAsAsked,
  } = useAppStore();

  const processAudioQueue = useCallback(async () => {
    if (isPlayingRef.current || audioBufferQueueRef.current.length === 0) {
      return;
    }

    isPlayingRef.current = true;

    while (audioBufferQueueRef.current.length > 0) {
      const item = audioBufferQueueRef.current.shift();
      if (!item) break;

      const { data: base64Audio, mime: mimeType } = item;

      let sampleRate = 24000;
      const rateMatch = mimeType.match(/rate=(\d+)/i);
      if (rateMatch?.[1]) {
        sampleRate = Number(rateMatch[1]) || sampleRate;
      }

      try {
        const binary = atob(base64Audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        const pcm16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) {
          float32[i] = pcm16[i] / 32768;
        }

        if (!playbackContextRef.current) {
          playbackContextRef.current = new AudioContext({ sampleRate });
        }
        const ctx = playbackContextRef.current;

        const buffer = ctx.createBuffer(1, float32.length, sampleRate);
        buffer.copyToChannel(float32, 0);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);

        const now = ctx.currentTime;
        const startAt = Math.max(now, nextPlaybackTimeRef.current);
        source.start(startAt);
        nextPlaybackTimeRef.current = startAt + buffer.duration;

        // Small delay to allow smooth continuous playback
        const delayMs = Math.max(0, (startAt - now) * 1000 - 50);
        if (delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        console.error("Error playing audio chunk:", error);
      }
    }

    isPlayingRef.current = false;
  }, []);

  const queueAudio = useCallback((base64Audio: string, mimeType: string) => {
    audioBufferQueueRef.current.push({ data: base64Audio, mime: mimeType });
    processAudioQueue();
  }, [processAudioQueue]);

  const connect = useCallback(() => {
    if (!sessionId) return;

    try {
      const ws = createWebSocketConnection(sessionId);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WebSocket connected");
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const message: WSIncomingMessage = JSON.parse(event.data);

          switch (message.type) {
            case "transcript":
              addTranscriptSegment(message.segment);
              break;

            case "audio_response":
              queueAudio(message.audio_data, message.mime_type);
              break;

            case "questions_response":
              setSuggestedQuestions(message.questions);
              setIsLoadingQuestions(false);
              break;

            case "question_marked_asked":
              markQuestionAsAsked((message as any).question_id);
              break;

            case "context_response":
              setClinicalContext(message.context);
              setIsLoadingContext(false);
              break;

            case "summary_response":
              setSummary(message.summary);
              setIsLoadingSummary(false);
              break;

            case "error":
              console.error("Server error:", message.error);
              setError(message.error);
              break;

            default:
              console.warn("Unknown message type:", (message as any).type);
          }
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        setError("WebSocket connection error");
      };

      ws.onclose = () => {
        console.log("🔌 WebSocket closed");
        setIsConnected(false);

        // Attempt reconnection after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("🔄 Attempting to reconnect...");
          connect();
        }, 3000);
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      setError("Failed to create WebSocket connection");
    }
  }, [
    sessionId,
    setIsConnected,
    setError,
    addTranscriptSegment,
    setSuggestedQuestions,
    setIsLoadingQuestions,
    setClinicalContext,
    setIsLoadingContext,
    setSummary,
    setIsLoadingSummary,
    markQuestionAsAsked,
    queueAudio,
    processAudioQueue,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (playbackContextRef.current) {
      playbackContextRef.current.close();
      playbackContextRef.current = null;
    }
    nextPlaybackTimeRef.current = 0;
    audioBufferQueueRef.current = [];
    isPlayingRef.current = false;

    setIsConnected(false);
  }, [setIsConnected]);

  const sendMessage = useCallback((message: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not connected, cannot send message");
    }
  }, []);

  useEffect(() => {
    if (sessionId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [sessionId, connect, disconnect]);

  return {
    sendMessage,
    disconnect,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
};
