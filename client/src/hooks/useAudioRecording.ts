import { useState, useCallback, useRef } from "react";
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
  const [lastProcessedPosition, setLastProcessedPosition] = useState<number>(0);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    console.debug('[Audio Recording] Starting new recording session');
    try {
      console.debug('[Audio Recording] Checking browser compatibility and permissions');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser does not support audio recording');
      }

      // Check permission status
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      console.debug('[Audio Recording] Permission status:', permissionStatus.state);

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        }
      });
      
      console.debug('[Audio Recording] Stream active:', stream.active);
      console.debug('[Audio Recording] Permissions granted:', stream.getAudioTracks()[0].enabled);

      // Reset chunks array
      chunksRef.current = [];

      console.debug('[Audio Recording] Initializing MediaRecorder');
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
        audioBitsPerSecond: 128000
      });

      console.debug('[Audio Recording] MediaRecorder created:', recorder.state);

      recorder.ondataavailable = async (event) => {
        console.debug('[Audio Recording] Data chunk received:', event.data.size);
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          
          try {
            const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
            const transcript = await transcribeAudio(audioBlob);
            
            if (transcript && transcript.text) {
              // Only get the new portion of text after our last processed position
              const fullText = transcript.text;
              const newText = fullText.slice(lastProcessedPosition).trim();
              
              if (newText) {
                console.debug('[Audio Recording] New text portion:', newText);
                const speaker = determineSpeaker(newText);
                onTranscript(newText, speaker);
                
                const analysis = await analyzeTranscript(newText);
                onAnalysis(analysis);
                
                // Update our position to the end of the full text
                setLastProcessedPosition(fullText.length);
              }
            }
          } catch (error) {
            console.error('[Audio Recording] Processing error:', error);
            setError('Failed to process audio chunk');
          }
        }
      };

      recorder.onstop = () => {
        console.debug('[Audio Recording] Recording stopped, combining chunks');
        const finalBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        console.debug('[Audio Recording] Final audio size:', finalBlob.size);
      };

      recorder.onerror = (event) => {
        console.error('[Audio Recording] Recorder error:', event);
        setError('Recording error occurred');
      };

      setMediaRecorder(recorder);

      console.debug('[Audio Recording] Recorder inactive, attempting to start');
      recorder.start(3000); // Start with 3-second intervals
      console.debug('[Audio Recording] Recording started successfully');

    } catch (error) {
      console.error('[Audio Recording] Setup error:', error);
      setError(error instanceof Error ? error.message : 'Failed to start recording');
    }
  }, [onTranscript, onAnalysis]);

  const stopRecording = useCallback(() => {
    console.debug('[Audio Recording] Stopping recording');
    if (mediaRecorder?.state === 'recording') {
      try {
        mediaRecorder.stop();
        const tracks = mediaRecorder.stream.getTracks();
        tracks.forEach(track => {
          track.stop();
          console.debug('[Audio Recording] Track stopped:', track.kind);
        });
        // Reset position when stopping
        setLastProcessedPosition(0);
        chunksRef.current = [];
      } catch (error) {
        console.error('[Audio Recording] Stop error:', error);
        setError('Failed to stop recording');
      }
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
