/**
 * Direct Gemini Live WebSocket connection hook (matching veyra-ai architecture)
 */
import { useRef, useCallback, useState } from 'react';
import type { TranscriptSegment } from '../types';

const WS_SAMPLE_RATE_IN = 16000;
const WS_SAMPLE_RATE_OUT = 24000;

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'listening' | 'speaking';

interface ConnectionDetails {
  accessToken: string;
  model: string;
  wsUrl: string;
}

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const downsampleTo16k = (input: Float32Array, inputSampleRate: number): Float32Array => {
  if (inputSampleRate === WS_SAMPLE_RATE_IN) return input;

  const ratio = inputSampleRate / WS_SAMPLE_RATE_IN;
  const newLength = Math.round(input.length / ratio);
  const result = new Float32Array(newLength);

  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < input.length; i++) {
      accum += input[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
};

const floatTo16BitPCM = (input: Float32Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);

  let offset = 0;
  for (let i = 0; i < input.length; i++, offset += 2) {
    let sample = Math.max(-1, Math.min(1, input[i]));
    sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(offset, sample, true);
  }

  return buffer;
};

const pcm16ToFloat32 = (buffer: ArrayBuffer): Float32Array => {
  const dataView = new DataView(buffer);
  const samples = new Float32Array(buffer.byteLength / 2);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = dataView.getInt16(i * 2, true) / 0x8000;
  }
  return samples;
};

const wsDataToText = async (data: string | Blob | ArrayBuffer): Promise<string> => {
  if (typeof data === 'string') return data;
  if (data instanceof Blob) return data.text();
  return new TextDecoder().decode(data);
};

export const useGeminiLive = () => {
  const [state, setState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioInputCtxRef = useRef<AudioContext | null>(null);
  const audioOutputCtxRef = useRef<AudioContext | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const inputNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const outputTimeRef = useRef(0);
  const setupCompleteRef = useRef(false);
  const mutedRef = useRef(false);
  const isRecordingRef = useRef(false);

  const activeSegmentRef = useRef<{ patient: TranscriptSegment | null; physician: TranscriptSegment | null }>({
    patient: null,
    physician: null,
  });

  const onTranscriptCallback = useRef<((segment: TranscriptSegment) => void) | null>(null);
  const onTranscriptUpdateCallback = useRef<((speaker: 'patient' | 'physician', text: string) => void) | null>(null);

  const mergeTranscriptText = useCallback((existing: string, incoming: string) => {
    const left = existing.trim();
    const right = incoming.trim();

    if (!left) return right;
    if (!right) return left;

    if (right.startsWith(left) || right.includes(left)) return right;
    if (left.startsWith(right) || left.includes(right)) return left;

    return `${left} ${right}`.replace(/\s+/g, ' ').trim();
  }, []);

  const queueModelAudio = useCallback(async (base64Data: string) => {
    console.log('🔊 Queueing AI audio response...');
    if (!audioOutputCtxRef.current) {
      audioOutputCtxRef.current = new AudioContext({ sampleRate: WS_SAMPLE_RATE_OUT });
    }

    const ctx = audioOutputCtxRef.current;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const pcmBuffer = base64ToArrayBuffer(base64Data);
    const floatData = pcm16ToFloat32(pcmBuffer);
    const audioBuffer = ctx.createBuffer(1, floatData.length, WS_SAMPLE_RATE_OUT);
    audioBuffer.copyToChannel(new Float32Array(floatData), 0);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const startAt = Math.max(ctx.currentTime, outputTimeRef.current);
    source.start(startAt);
    outputTimeRef.current = startAt + audioBuffer.duration;
    console.log(`✅ AI audio queued (duration: ${audioBuffer.duration.toFixed(2)}s)`);
  }, []);

  const handleTranscript = useCallback((speaker: 'patient' | 'physician', text: string) => {
    const incoming = text.trim();
    if (!incoming) return;

    const activeSegment = activeSegmentRef.current[speaker];
    const now = Date.now();

    // If there's an active segment for this speaker and it's recent (within 8 seconds), merge
    if (activeSegment && now - (activeSegment.timestamp * 1000) < 8000) {
      const mergedText = mergeTranscriptText(activeSegment.text, incoming);
      activeSegment.text = mergedText;
      
      // Notify update
      if (onTranscriptUpdateCallback.current) {
        onTranscriptUpdateCallback.current(speaker, mergedText);
      }
    } else {
      // Create new segment
      const newSegment: TranscriptSegment = {
        speaker,
        text: incoming,
        timestamp: now / 1000,
        confidence: undefined,
      };
      
      activeSegmentRef.current[speaker] = newSegment;
      
      if (onTranscriptCallback.current) {
        onTranscriptCallback.current(newSegment);
      }
    }
  }, [mergeTranscriptText]);

  const startAudioInput = useCallback(async () => {
    try {
      console.log('🎤 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStreamRef.current = stream;
      console.log('✅ Microphone access granted');

      stream.getAudioTracks().forEach((track) => {
        track.enabled = !mutedRef.current;
        console.log(`Microphone track: ${track.label}, enabled: ${track.enabled}`);
      });

      const audioCtx = new AudioContext();
      audioInputCtxRef.current = audioCtx;

      const inputNode = audioCtx.createMediaStreamSource(stream);
      inputNodeRef.current = inputNode;

      const processor = audioCtx.createScriptProcessor(2048, 1, 1);
      processorNodeRef.current = processor;

      processor.onaudioprocess = (event) => {
        // Only process audio if recording is active, not muted, and setup is complete
        if (!isRecordingRef.current || mutedRef.current || !setupCompleteRef.current) return;
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const inputData = event.inputBuffer.getChannelData(0);
        const downsampled = downsampleTo16k(inputData, audioCtx.sampleRate);
        const pcm = floatTo16BitPCM(downsampled);
        const encoded = arrayBufferToBase64(pcm);

        wsRef.current.send(
          JSON.stringify({
            realtimeInput: {
              audio: {
                data: encoded,
                mimeType: 'audio/pcm;rate=16000',
              },
            },
          })
        );
      };

      // Connect input to processor, but DON'T connect to destination
      // (we don't want to hear our own microphone input)
      inputNode.connect(processor);
      // Note: processor must connect to SOMETHING for onaudioprocess to fire
      // Use a gain node set to 0 to avoid feedback
      const silentGain = audioCtx.createGain();
      silentGain.gain.value = 0;
      processor.connect(silentGain);
      silentGain.connect(audioCtx.destination);
      console.log('✅ Audio input processing started');
    } catch (err) {
      console.error('❌ Failed to start audio input:', err);
      throw err;
    }
  }, []);

  const connect = useCallback(async (
    sessionId: string, 
    onTranscript?: (segment: TranscriptSegment) => void,
    onTranscriptUpdate?: (speaker: 'patient' | 'physician', text: string) => void
  ) => {
    setState('connecting');
    setError(null);

    if (onTranscript) {
      onTranscriptCallback.current = onTranscript;
    }
    if (onTranscriptUpdate) {
      onTranscriptUpdateCallback.current = onTranscriptUpdate;
    }

    try {
      // Get connection details from backend
      const res = await fetch(`http://localhost:8000/api/connection-details`);
      if (!res.ok) {
        throw new Error(`Failed to get connection details: HTTP ${res.status}`);
      }

      const details: ConnectionDetails = await res.json();
      const wsUrl = `${details.wsUrl}?access_token=${encodeURIComponent(details.accessToken)}`;
      
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Gemini Live WebSocket connected');
        ws.send(
          JSON.stringify({
            setup: {
              model: `models/${details.model}`,
              generationConfig: {
                responseModalities: ['AUDIO'], // AI can respond with voice
              },
              realtimeInputConfig: {
                automaticActivityDetection: {
                  disabled: false,
                },
              },
              inputAudioTranscription: {}, // Enable patient speech transcription
              outputAudioTranscription: {}, // Enable AI transcription
              systemInstruction: {
                role: 'system',
                parts: [
                  {
                    text: [
                      'You are MediScribe AI, a real-time medical assistant supporting a physician-patient conversation.',
                      'Use a calm, clear, and clinically grounded tone.',
                      'Have a natural back-and-forth conversation. Do not give a full assessment all at once.',
                      'Default turn format: brief acknowledgement plus exactly one focused follow-up question.',
                      'In most turns, ask exactly one focused follow-up question and keep the response to 1 to 3 short sentences.',
                      'Do not list causes, remedies, or safety advice in the first turn unless the user directly asks for them.',
                      'Only after enough details are collected, briefly explain plausible causes in plain language and offer practical self-care or basic treatment options when generally safe.',
                      'Do not provide a definitive diagnosis, prescription-only treatment plans, or exact medication dosing.',
                      'When relevant, mention urgent red-flag symptoms that need immediate emergency care.',
                      'If recommending professional care, place that recommendation only at the end of the response and only once.',
                      'Do not start with a disclaimer.',
                      'Avoid repeating previous information unless the patient asks for a recap.',
                    ].join(' '),
                  },
                ],
              },
            },
          })
        );
      };

      ws.onmessage = async (event) => {
        let payload: Record<string, unknown>;
        try {
          const raw = await wsDataToText(event.data);
          payload = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          return;
        }

        const payloadError = payload.error as { message?: string } | string | undefined;
        if (payloadError) {
          const errorMessage =
            typeof payloadError === 'string'
              ? payloadError
              : payloadError.message || 'Gemini Live setup failed';
          console.error('❌ Gemini Live server error:', payloadError);
          setError(errorMessage);
        }

        if (payload.setupComplete) {
          setupCompleteRef.current = true;
          setState('connected');
          await startAudioInput();
        }

        const serverContent = payload.serverContent as Record<string, unknown> | undefined;
        if (serverContent) {
          // Handle model audio output
          const modelTurn = serverContent.modelTurn as { parts?: Array<Record<string, unknown>> } | undefined;
          if (Array.isArray(modelTurn?.parts)) {
            console.log(`📢 Received modelTurn with ${modelTurn.parts.length} parts`);
            setState('speaking');
            for (const part of modelTurn.parts) {
              const inlineData = part.inlineData as { data?: string } | undefined;
              if (inlineData?.data) {
                await queueModelAudio(inlineData.data);
              }
            }
          }

          // Handle patient input transcription
          const inputTranscription = serverContent.inputTranscription as { text?: string } | undefined;
          if (inputTranscription?.text) {
            console.log('👤 Patient said:', inputTranscription.text);
            handleTranscript('patient', inputTranscription.text);
            setState('listening');
          }

          // Handle AI output transcription
          const outputTranscription = serverContent.outputTranscription as { text?: string } | undefined;
          if (outputTranscription?.text) {
            console.log('🤖 AI said:', outputTranscription.text);
            handleTranscript('physician', outputTranscription.text);
          }

          // Handle interruption
          if (serverContent.interrupted === true) {
            outputTimeRef.current = audioOutputCtxRef.current?.currentTime ?? 0;
            setState('listening');
            activeSegmentRef.current.physician = null;
          }

          // Handle turn complete
          if (serverContent.turnComplete === true) {
            activeSegmentRef.current.patient = null;
            activeSegmentRef.current.physician = null;
            setState('connected');
          } else if (serverContent.generationComplete === true) {
            setState('connected');
          }
        }
      };

      ws.onerror = () => {
        setError('Gemini Live connection error');
        setState('disconnected');
      };

      ws.onclose = () => {
        setState('disconnected');
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect';
      setError(message);
      setState('disconnected');
    }
  }, [handleTranscript, queueModelAudio, startAudioInput]);

  const disconnect = useCallback(async () => {
    setupCompleteRef.current = false;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
      wsRef.current.close();
    }
    wsRef.current = null;

    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current.onaudioprocess = null;
      processorNodeRef.current = null;
    }

    if (inputNodeRef.current) {
      inputNodeRef.current.disconnect();
      inputNodeRef.current = null;
    }

    if (audioInputCtxRef.current) {
      await audioInputCtxRef.current.close();
      audioInputCtxRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioOutputCtxRef.current) {
      await audioOutputCtxRef.current.close();
      audioOutputCtxRef.current = null;
    }

    outputTimeRef.current = 0;
    setState('disconnected');
  }, []);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !mutedRef.current;
      });
    }
    return !mutedRef.current;
  }, []);

  const setRecording = useCallback((recording: boolean) => {
    console.log(`${recording ? '🎙️ Starting' : '⏸️ Pausing'} audio recording`);
    isRecordingRef.current = recording;
  }, []);

  return {
    state,
    error,
    connect,
    disconnect,
    toggleMute,
    setRecording,
    isMuted: () => mutedRef.current,
  };
};
