import { useRef, useCallback, useState } from 'react';

interface AudioCaptureOptions {
  onAudioData: (audioData: string) => void;
  sampleRate?: number;
  bufferSize?: number;
}

export const useAudioCapture = ({ onAudioData, sampleRate = 16000 }: AudioCaptureOptions) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const startCapture = useCallback(async () => {
    try {
      setError(null);
      
      // Request microphone access only (more reliable than system audio)
      console.log('🎤 Requesting microphone access...');
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: sampleRate,
          channelCount: 1,
        },
      });
      mediaStreamRef.current = micStream;

      // Create audio context
      audioContextRef.current = new AudioContext({ sampleRate });
      const audioContext = audioContextRef.current;

      // Create source from microphone
      const micSource = audioContext.createMediaStreamSource(micStream);

      // Create ScriptProcessorNode for audio processing
      // Note: ScriptProcessorNode is deprecated but widely supported
      // For production, consider using AudioWorklet
      const bufferSize = 4096;
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
      processorRef.current = processor;

      // Connect microphone to processor
      micSource.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32Array to Int16Array (PCM)
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Convert to base64
        const base64 = btoa(
          String.fromCharCode(...new Uint8Array(pcmData.buffer))
        );

        // Send all audio - Gemini Live handles VAD internally
        onAudioData(base64);
      };

      setIsCapturing(true);
      console.log('✅ Audio capture started (microphone only)');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Error starting audio capture:', err);
      setError(`Failed to start audio capture: ${errorMessage}`);
      setIsCapturing(false);
    }
  }, [onAudioData, sampleRate]);

  const stopCapture = useCallback(() => {
    console.log('🛑 Stopping audio capture...');

    // Stop processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Stop all media tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsCapturing(false);
    console.log('✅ Audio capture stopped');
  }, []);

  return {
    isCapturing,
    error,
    startCapture,
    stopCapture,
  };
};
