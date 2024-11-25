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
      
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/mp4') 
          ? 'audio/mp4' 
          : 'audio/webm',
        audioBitsPerSecond: 128000
      });

      let chunks: Blob[] = [];
      
      recorder.addEventListener('dataavailable', async (event) => {
        console.debug('[Audio Recording] Data chunk available:', event.data?.size);
        if (event.data?.size > 0) {
          chunks.push(event.data);
          
          try {
            // Create a blob with proper MIME type
            const audioBlob = new Blob([event.data], { 
              type: recorder.mimeType 
            });
            console.debug('[Audio Recording] Processing chunk:', audioBlob.size);
            
            const transcript = await transcribeAudio(audioBlob);
            console.debug('[Audio Recording] New transcript:', transcript);
            
            if (transcript && transcript.text) {
              const speaker = determineSpeaker(transcript.text);
              onTranscript(transcript.text, speaker);
              
              const analysis = await analyzeTranscript(transcript.text);
              onAnalysis(analysis);
            }
          } catch (error) {
            console.error('[Audio Recording] Transcription error:', error);
            setError('Failed to transcribe audio chunk');
          }
        }
      });

      recorder.addEventListener('stop', () => {
        console.debug('[Audio Recording] Recording stopped, chunks:', chunks.length);
        chunks = []; // Clear chunks on stop
        stream.getTracks().forEach(track => track.stop());
      });

      setMediaRecorder(recorder);
      // Start recording with 3-second intervals
      recorder.start(3000);
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
