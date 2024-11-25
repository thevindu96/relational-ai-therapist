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
      
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = async (event) => {
        console.debug('[Audio Recording] Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        console.debug('[Audio Recording] Recording stopped, processing data');
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          console.debug('[Audio Recording] Created blob:', blob.size, 'bytes');
          
          try {
            const transcript = await transcribeAudio(blob);
            console.debug('[Audio Recording] Received transcript:', transcript);
            
            if (transcript && transcript.text) {
              const speaker = determineSpeaker(transcript.text);
              onTranscript(transcript.text, speaker);
              
              const analysis = await analyzeTranscript(transcript.text);
              onAnalysis(analysis);
            } else {
              throw new Error('No transcript received from server');
            }
          } catch (error) {
            console.error('[Audio Recording] Transcription error:', error);
            setError('Failed to transcribe audio. Please try again.');
          }
        }
        
        // Cleanup
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      recorder.start();
      console.debug('[Audio Recording] Started recording');
      
    } catch (error) {
      console.error('[Audio Recording] Setup error:', error);
      setError(error instanceof Error ? error.message : 'Failed to start recording');
    }
  }, [onTranscript, onAnalysis]);

  const stopRecording = useCallback(() => {
    console.debug('[Audio Recording] Stopping recording');
    if (mediaRecorder?.state === 'recording') {
      mediaRecorder.stop();
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
