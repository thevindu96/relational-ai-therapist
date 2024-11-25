import { useState, useCallback, useRef, useEffect } from "react";
import { analyzeTranscript, transcribeAudio } from "../lib/api";
import { useToast } from "@/hooks/use-toast";

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
    console.debug('[Audio Recording] Checking browser compatibility and permissions');
    
    try {
      // Check browser compatibility
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Browser does not support audio recording');
      }

      // Check if permissions API is supported
      if (!navigator?.permissions?.query) {
        console.debug('[Audio Recording] Permissions API not supported, falling back to getUserMedia');
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        if (!stream || !stream.active) {
          throw new Error('Failed to initialize audio stream');
        }
        
        return stream;
      }

      // Check if permissions are already granted
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      console.debug('[Audio Recording] Permission status:', permissionStatus.state);
      
      // Handle permission status changes
      permissionStatus.addEventListener('change', () => {
        console.debug('[Audio Recording] Permission status changed to:', permissionStatus.state);
        if (permissionStatus.state === 'denied') {
          cleanup();
          setError('Microphone access was revoked. Please allow access in your browser settings.');
        }
      });
      
      if (permissionStatus.state === 'denied') {
        throw new Error('Microphone access is blocked. Please allow access in your browser settings.');
      }

      // Even if permission is granted or prompt, we still need to request the stream
      // as this also handles device selection and initialization
      console.debug('[Audio Recording] Requesting audio stream with settings');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.debug('[Audio Recording] Stream active:', stream?.active);
      if (!stream || !stream.active) {
        throw new Error('Failed to initialize audio stream');
      }

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

  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    console.debug('[Audio Recording] Attempting to start recording');
    try {
      // Check if already recording
      if (mediaRecorder?.state === 'recording') {
        console.debug('[Audio Recording] Already recording, stopping current session');
        cleanup();
      }
      
      // Clean up any existing recordings
      cleanup();
      setError(null);

      // Check permissions and get stream
      console.debug('[Audio Recording] Checking permissions');
      const stream = await checkPermissions();
      console.debug('[Audio Recording] Permissions granted:', stream.active);
      
      // Initialize audio context
      const audioContext = initializeAudioContext(stream);
      const source = audioContext.createMediaStreamSource(stream);

      console.debug('[Audio Recording] Initializing MediaRecorder');
      
      // Check for MediaRecorder support
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder is not supported in this browser');
      }

      // Setup MediaRecorder with optimal settings
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm',
          audioBitsPerSecond: 128000
        });
        console.debug('[Audio Recording] MediaRecorder created:', recorder.state);
      } catch (error) {
        console.error('[Audio Recording] Failed to initialize MediaRecorder:', error);
        throw new Error('Failed to initialize audio recorder. Please try a different browser.');
      }
      
      recorder.addEventListener('dataavailable', async (event) => {
        console.debug('[Audio Recording] Data available event fired');
        if (event.data && event.data.size > 0) {
          console.debug('[Audio Recording] Processing chunk of size:', event.data.size);
          setAudioChunks((chunks) => [...chunks, event.data]);
          await processAudioChunk(event.data);
        } else {
          console.debug('[Audio Recording] Empty data chunk received');
        }
      });

      recorder.addEventListener('error', (event) => {
        const error = event instanceof Error ? event : new Error('Recording error occurred');
        setError("Recording error: " + error.message);
        cleanup();
      });

      // Start recording with shorter intervals for more responsive transcription
      if (!recorder || recorder.state === 'inactive') {
        console.debug('[Audio Recording] Recorder inactive, attempting to start');
        recorder.start(1500);
        if (recorder.state !== 'recording') {
          throw new Error('Failed to start recording');
        }
      }
      
      setMediaRecorder(recorder);
      console.debug('[Audio Recording] Recording started successfully');
    } catch (error) {
      cleanup();
      const errorMessage = error instanceof Error ? error.message : "Failed to start recording";
      console.error("[Audio Recording] Error starting recording:", error);
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Recording Error",
        description: errorMessage,
      });
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
