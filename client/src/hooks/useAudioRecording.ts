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

  const processAudioChunk = async (chunk: Blob) => {
    try {
      const transcript = await transcribeAudio(chunk);
      const speaker = determineSpeaker(transcript.text); // Simple heuristic
      onTranscript(transcript.text, speaker);
      
      const analysis = await analyzeTranscript(transcript.text);
      onAnalysis(analysis);
    } catch (error) {
      console.error("Error processing audio:", error);
    }
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          setAudioChunks((chunks) => [...chunks, event.data]);
          await processAudioChunk(event.data);
        }
      };

      recorder.start(2000); // Capture in 2-second intervals
      setMediaRecorder(recorder);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      setAudioChunks([]);
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
