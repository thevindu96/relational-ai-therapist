import { useState, useCallback } from "react";
import { analyzeTranscript } from "../lib/api";

interface UseAudioRecordingProps {
  onTranscript: (text: string, speaker: number) => void;
  onAnalysis: (analysis: { rating: "bad" | "medium" | "good"; feedback: string }) => void;
}

export function useAudioRecording({
  onTranscript,
  onAnalysis,
}: UseAudioRecordingProps) {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startRecording = useCallback(async () => {
    console.debug('[Audio Recording] Starting new recording session');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      
      // Use webm with opus codec which is widely supported
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      recorder.addEventListener('dataavailable', async (event) => {
        if (event.data?.size > 0) {
          try {
            // Create FormData with proper MIME type
            const formData = new FormData();
            formData.append('audio', event.data, 'audio.webm');
            
            const response = await fetch('/api/transcribe', {
              method: 'POST',
              body: formData
            });
            
            if (!response.ok) {
              throw new Error(`Transcription failed: ${response.status}`);
            }
            
            const data = await response.json();
            console.debug('[Audio Recording] Transcription received:', data);
            
            if (data.text) {
              const speaker = determineSpeaker(data.text);
              onTranscript(data.text, speaker);
              
              const analysis = await analyzeTranscript(data.text);
              onAnalysis(analysis);
            }
          } catch (error) {
            console.error('[Audio Recording] Transcription error:', error);
            setError('Failed to transcribe audio chunk');
          }
        }
      });

      recorder.addEventListener('stop', () => {
        console.debug('[Audio Recording] Recording stopped');
        stream.getTracks().forEach(track => track.stop());
      });

      setMediaRecorder(recorder);
      // Start recording with shorter intervals (2 seconds)
      recorder.start(2000);
      console.debug('[Audio Recording] Started recording with live transcription');
      
    } catch (error) {
      console.error('[Audio Recording] Setup error:', error);
      setError(error instanceof Error ? error.message : 'Failed to start recording');
    }
  }, [onTranscript, onAnalysis]);

  const stopRecording = useCallback(() => {
    console.debug('[Audio Recording] Stopping recording');
    try {
      if (mediaRecorder?.state === 'recording') {
        mediaRecorder.stop();
      }
    } catch (error) {
      console.error('[Audio Recording] Stop error:', error);
      setError('Failed to stop recording properly');
    }
  }, [mediaRecorder]);

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
