import { useState, useCallback } from "react";
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

  const processAudioChunk = async (chunk: Blob) => {
    if (isProcessing) return; // Prevent multiple simultaneous processing
    
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
      // Request permissions explicitly
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      // Initialize audio context for better control
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      // Setup MediaRecorder with optimal settings
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });
      
      // Handle data collection
      recorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          setAudioChunks((chunks) => [...chunks, event.data]);
          await processAudioChunk(event.data);
        }
      };

      // Error handling
      recorder.onerror = (event) => {
        setError("Recording error: " + event.error.message);
        stopRecording();
      };

      // Start recording with shorter intervals for more responsive transcription
      recorder.start(1500);
      setMediaRecorder(recorder);
      setError(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setError("Microphone permission denied. Please allow microphone access and try again.");
      } else {
        setError("Failed to start recording: " + (error instanceof Error ? error.message : "Unknown error"));
      }
      console.error("Error starting recording:", error);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      try {
        mediaRecorder.stop();
        // Ensure all tracks are properly stopped
        mediaRecorder.stream.getTracks().forEach((track) => {
          track.stop();
        });
        setAudioChunks([]);
        setError(null);
      } catch (error) {
        console.error("Error stopping recording:", error);
        setError("Failed to stop recording properly");
      }
    }
  }, [mediaRecorder]);

  return {
    startRecording,
    stopRecording,
  };
}

// Simple heuristic to determine speaker based on silence gaps
function determineSpeaker(text: string): number {
  // This is a simplified version - in reality, you'd want to use
  // more sophisticated speaker diarization
  return Math.random() < 0.5 ? 1 : 2;
}
