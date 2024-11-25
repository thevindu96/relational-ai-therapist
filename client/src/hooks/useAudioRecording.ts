import { useState, useCallback, useRef, useEffect } from "react";
import { analyzeTranscript, transcribeAudio } from "../lib/api";

interface UseAudioRecordingProps {
  onTranscript: (text: string, speaker: number) => void;
  onAnalysis: (analysis: { rating: "bad" | "medium" | "good"; feedback: string }) => void;
}

export function useAudioRecording({
  onTranscript,
  onAnalysis,
}: UseAudioRecordingProps) {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    // Stop all tracks in the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
      audioContextRef.current = null;
    }

    // Reset media recorder
    if (mediaRecorder) {
      try {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      } catch (err) {
        console.error('Error stopping mediaRecorder:', err);
      }
      setMediaRecorder(null);
    }

    setAudioChunks([]);
  }, [mediaRecorder]);

  const checkPermissions = useCallback(async () => {
    try {
      // Check if permissions are already granted
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      if (permissionStatus.state === 'denied') {
        throw new Error('Microphone access is blocked. Please allow access in your browser settings.');
      }

      // Even if permission is granted or prompt, we still need to request the stream
      // as this also handles device selection and initialization
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      streamRef.current = stream;
      return stream;
    } catch (error) {
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            throw new Error('Microphone permission denied. Please allow microphone access and try again.');
          case 'NotFoundError':
            throw new Error('No microphone found. Please connect a microphone and try again.');
          case 'NotReadableError':
            throw new Error('Could not access your microphone. Please check if it\'s properly connected.');
          default:
            throw new Error(`Microphone access error: ${error.message}`);
        }
      }
      throw error;
    }
  }, []);

  const initializeAudioContext = useCallback((stream: MediaStream) => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      return audioContextRef.current;
    } catch (error) {
      throw new Error('Failed to initialize audio context: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, []);

  const processAudioChunk = async (chunk: Blob) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      const transcript = await transcribeAudio(chunk);
      const speaker = determineSpeaker(transcript.text);
      onTranscript(transcript.text, speaker);
      
      const analysis = await analyzeTranscript(transcript.text);
      onAnalysis(analysis);
    } catch (error) {
      console.error("Error processing audio:", error);
      setError(error instanceof Error ? error.message : "Error processing audio");
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = useCallback(async () => {
    try {
      // Clean up any existing recordings
      cleanup();
      setError(null);

      // Check permissions and get stream
      const stream = await checkPermissions();
      
      // Initialize audio context
      const audioContext = initializeAudioContext(stream);
      const source = audioContext.createMediaStreamSource(stream);

      // Setup MediaRecorder with optimal settings
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });
      
      recorder.addEventListener('dataavailable', async (event) => {
        if (event.data.size > 0) {
          setAudioChunks((chunks) => [...chunks, event.data]);
          await processAudioChunk(event.data);
        }
      });

      recorder.addEventListener('error', (event) => {
        const error = event instanceof Error ? event : new Error('Recording error occurred');
        setError("Recording error: " + error.message);
        cleanup();
      });

      // Start recording with shorter intervals for more responsive transcription
      recorder.start(1500);
      setMediaRecorder(recorder);
    } catch (error) {
      cleanup();
      setError(error instanceof Error ? error.message : "Failed to start recording");
      console.error("Error starting recording:", error);
    }
  }, [cleanup, checkPermissions, initializeAudioContext]);

  const stopRecording = useCallback(() => {
    try {
      cleanup();
      setError(null);
    } catch (error) {
      console.error("Error stopping recording:", error);
      setError("Failed to stop recording properly");
    }
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    startRecording,
    stopRecording,
    error,
  };
}

// Simple heuristic to determine speaker based on silence gaps
function determineSpeaker(text: string): number {
  // This is a simplified version - in reality, you'd want to use
  // more sophisticated speaker diarization
  return Math.random() < 0.5 ? 1 : 2;
}
