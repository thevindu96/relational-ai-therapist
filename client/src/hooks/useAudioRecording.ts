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
  const [recordingPromise, setRecordingPromise] = useState<Promise<Blob> | null>(null);
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

    // Clear audio chunks
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

  

  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    console.debug('[Audio Recording] Starting new recording session');
    try {
      // Clean up any existing recordings
      cleanup();
      setError(null);

      const stream = await checkPermissions();
      const chunks: Blob[] = [];
      
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      // Create a promise that will resolve with the complete recording
      const promise = new Promise<Blob>((resolve, reject) => {
        recorder.ondataavailable = (e) => {
          console.debug('[Audio Recording] Data chunk received:', e.data.size);
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        recorder.onstop = () => {
          console.debug('[Audio Recording] Recording stopped, combining chunks');
          const completeBlob = new Blob(chunks, { type: chunks[0].type });
          resolve(completeBlob);
        };

        recorder.onerror = (event) => {
          console.error('[Audio Recording] Recording error:', event);
          reject(new Error('Recording failed'));
        };
      });

      setRecordingPromise(promise);
      recorder.start();
      setMediaRecorder(recorder);

    } catch (error) {
      console.error('[Audio Recording] Setup error:', error);
      setError(error instanceof Error ? error.message : 'Failed to start recording');
      toast({
        variant: "destructive",
        title: "Recording Error",
        description: error instanceof Error ? error.message : 'Failed to start recording',
      });
    }
  }, [cleanup, checkPermissions]);

  const stopRecording = useCallback(async () => {
    console.debug('[Audio Recording] Stopping recording');
    try {
      if (mediaRecorder?.state === 'recording') {
        mediaRecorder.stop();
        
        if (recordingPromise) {
          const audioBlob = await recordingPromise;
          console.debug('[Audio Recording] Processing complete audio:', audioBlob.size);
          
          const transcript = await transcribeAudio(audioBlob);
          console.debug('[Audio Recording] Transcript received:', transcript.text);
          
          const speaker = determineSpeaker(transcript.text);
          onTranscript(transcript.text, speaker);
          
          const analysis = await analyzeTranscript(transcript.text);
          onAnalysis(analysis);
        }
      }
    } catch (error) {
      console.error('[Audio Recording] Processing error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process recording');
      toast({
        variant: "destructive",
        title: "Processing Error",
        description: error instanceof Error ? error.message : 'Failed to process recording',
      });
    } finally {
      cleanup();
      setRecordingPromise(null);
    }
  }, [mediaRecorder, recordingPromise, cleanup, onTranscript, onAnalysis]);

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
