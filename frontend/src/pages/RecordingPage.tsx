import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/appStore";
import { useGeminiLive } from "../hooks/useGeminiLive";
import { api } from "../services/api";
import type { TranscriptSegment, Speaker } from "../types";
import { TranscriptView } from "../components/TranscriptView.tsx";
import { QuestionPanel } from "../components/QuestionPanel.tsx";
import { ContextPanel } from "../components/ContextPanel.tsx";
import { SummaryModal } from "../components/SummaryModal.tsx";

export const RecordingPage = () => {
  const navigate = useNavigate();
  const {
    sessionId,
    isRecording,
    setIsRecording,
    setSessionStartTime,
    showSummaryModal,
    setShowSummaryModal,
    reset,
    addTranscriptSegment,
    updateLastSegment,
    setIsConnected,
    transcript,
    setSuggestedQuestions,
    setIsLoadingQuestions,
    setClinicalContext,
    setIsLoadingContext,
    setSummary,
    setIsLoadingSummary,
    markQuestionAsAsked,
  } = useAppStore();

  const [sessionDuration, setSessionDuration] = useState(0);

  // Direct Gemini Live connection (like veyra-ai)
  const { state, error: audioError, connect, disconnect, toggleMute, setRecording } = useGeminiLive();

  // Redirect if no session
  useEffect(() => {
    if (!sessionId) {
      navigate("/");
    } else if (state === 'disconnected' && !audioError) {
      // Auto-connect when page loads
      console.log('🔌 Auto-connecting to Gemini Live...');
      connect(
        sessionId, 
        (segment: TranscriptSegment) => {
          addTranscriptSegment(segment);
        },
        (speaker: Speaker, text: string) => {
          updateLastSegment(speaker, text);
        }
      );
    }
  }, [sessionId, state, audioError, navigate, connect]); // Removed addTranscriptSegment and updateLastSegment to prevent re-connections

  // Update app store connection state
  useEffect(() => {
    setIsConnected(state !== 'disconnected');
  }, [state, setIsConnected]);

  // Session timer
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setSessionDuration((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isRecording]);

  // Auto-refresh questions and context periodically when recording
  useEffect(() => {
    if (isRecording && sessionId && transcript.length > 0) {
      // Initial fetch after 10 seconds
      const initialTimer = setTimeout(() => {
        handleRequestQuestions();
        handleRequestContext();
      }, 10000);

      // Then refresh every 30 seconds
      const interval = setInterval(() => {
        handleRequestQuestions();
        handleRequestContext();
      }, 30000);

      return () => {
        clearTimeout(initialTimer);
        clearInterval(interval);
      };
    }
  }, [isRecording, sessionId, transcript.length]);

  const handleStartRecording = async () => {
    setIsRecording(true);
    setSessionStartTime(new Date());
    setRecording(true); // Enable audio capture
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setRecording(false); // Disable audio capture
  };

  const handleEndSession = async () => {
    await disconnect();
    reset();
    navigate("/");
  };

  const handleRequestQuestions = async () => {
    if (!sessionId || transcript.length === 0) return;
    
    setIsLoadingQuestions(true);
    try {
      const response = await api.generateQuestions(sessionId, transcript);
      setSuggestedQuestions(response.questions || []);
    } catch (error) {
      console.error('Failed to generate questions:', error);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleRequestContext = async () => {
    if (!sessionId || transcript.length === 0) return;
    
    setIsLoadingContext(true);
    try {
      const response = await api.extractContext(sessionId, transcript);
      setClinicalContext(response.context || null);
    } catch (error) {
      console.error('Failed to extract context:', error);
    } finally {
      setIsLoadingContext(false);
    }
  };

  const handleRequestSummary = async () => {
    if (!sessionId || transcript.length === 0) return;
    
    setShowSummaryModal(true);
    setIsLoadingSummary(true);
    try {
      const response = await api.generateSummary(sessionId, transcript);
      setSummary(response.summary || null);
    } catch (error) {
      console.error('Failed to generate summary:', error);
      setSummary(null);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleMarkQuestionAsked = (questionId: string) => {
    markQuestionAsAsked(questionId);
  };

  const handleToggleMute = () => {
    toggleMute();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const stateLabel = 
    state === 'speaking' ? 'AI Speaking' :
    state === 'listening' ? 'Listening' :
    state === 'connecting' ? 'Connecting' :
    state === 'connected' ? 'Connected' : 'Disconnected';

  if (!sessionId) {
    return null;
  }

  const isConnected = state !== 'disconnected';

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="bg-canvas border-b border-hairline">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Title & Status */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <img
                  src="/MediScribe_logo.png"
                  alt="MediScribe AI"
                  className="w-10 h-10 rounded-lg object-cover"
                />
                <span className="text-2xl font-semibold text-ink">MediScribe AI</span>
              </div>
              <div className="flex items-center">
                {isRecording && (
                  <span className="flex h-2 w-2 relative mr-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
                  </span>
                )}
                <h1 className="text-body-large font-normal text-muted">
                  Clinical Session
                </h1>
              </div>

              <div className="flex items-center space-x-4 text-caption text-muted">
                <span>{formatDuration(sessionDuration)}</span>
                <span className="flex items-center">
                  <span
                    className={`inline-block w-2 h-2 rounded-full mr-2 ${
                      isConnected ? "bg-success" : "bg-error"
                    }`}
                  ></span>
                  {stateLabel}
                </span>
              </div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleToggleMute}
                className="px-4 py-2 bg-canvas text-ink text-button border border-hairline rounded-sm hover:bg-soft-stone transition-colors"
                title="Toggle Mute"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h2a2 2 0 002-2V4a2 2 0 00-2-2H9z" clipRule="evenodd" />
                  <path d="M6 8a1 1 0 011-1h1a1 1 0 110 2H7a1 1 0 01-1-1zm3 5a3 3 0 01-3-3H5a5 5 0 0010 0h-1a3 3 0 01-3 3v1h4a1 1 0 110 2H6a1 1 0 110-2h4v-1z" />
                </svg>
              </button>
              
              {!isRecording ? (
                <button
                  onClick={handleStartRecording}
                  className="px-4 py-2 bg-success text-on-primary text-button rounded-sm hover:opacity-90 transition-opacity flex items-center"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Start
                </button>
              ) : (
                <button
                  onClick={handleStopRecording}
                  className="px-4 py-2 bg-warning text-on-primary text-button rounded-sm hover:opacity-90 transition-opacity flex items-center"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Pause
                </button>
              )}

              <button
                onClick={handleRequestSummary}
                className="px-4 py-2 bg-primary text-on-primary text-button rounded-pill hover:bg-ink transition-colors"
              >
                Generate Summary
              </button>

              <button
                onClick={handleEndSession}
                className="px-4 py-2 bg-canvas text-error text-button border border-error rounded-sm hover:bg-error hover:text-on-primary transition-colors"
              >
                End Session
              </button>
            </div>
          </div>

          {audioError && (
            <div className="mt-3 text-caption text-error bg-error/10 px-4 py-2 rounded-sm border border-error/20">
              {audioError}
            </div>
          )}

          {isConnected && !isRecording && !audioError && (
            <div className="mt-3 text-caption text-primary bg-primary/10 px-4 py-2 rounded-sm border border-primary/20">
              📢 Ready to record. Click the "Start" button to begin capturing audio from your conversation.
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Transcript (wider) */}
          <div className="lg:col-span-2">
            <TranscriptView />
          </div>

          {/* Right Column - Questions & Context (stacked) */}
          <div className="lg:col-span-1">
            <div className="h-[calc(100vh-200px)] flex flex-col space-y-4">
              <div className="flex-[0.6] min-h-0">
                <QuestionPanel
                  onRefresh={handleRequestQuestions}
                  onMarkAsked={handleMarkQuestionAsked}
                />
              </div>
              <div className="flex-[0.4] min-h-0">
                <ContextPanel onRefresh={handleRequestContext} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Summary Modal */}
      {showSummaryModal && <SummaryModal />}
    </div>
  );
};
