import { useEffect } from "react";
import { useAudioRecording } from "../hooks/useAudioRecording";
import { Button } from "@/components/ui/button";
import { Mic, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RecordButtonProps {
  isRecording: boolean;
  onStop: () => void;
  onTranscript: (text: string, speaker: number) => void;
  onAnalysis: (analysis: { rating: "bad" | "medium" | "good"; feedback: string }) => void;
  onRecordingStateChange: (recording: boolean) => void;
}

export default function RecordButton({
  isRecording,
  onStop,
  onTranscript,
  onAnalysis,
}: RecordButtonProps) {
  const { startRecording: startAudioRecording, stopRecording: stopAudioRecording, error } = useAudioRecording({
    onTranscript,
    onAnalysis,
  });

  const handleStartRecording = async () => {
    console.debug('[Recording] Starting recording');
    await startAudioRecording();
    // Set recording state after successful start
    onRecordingStateChange(true);
  };

  const handleStopRecording = () => {
    console.debug('[Recording] Stopping recording');
    stopAudioRecording();
    onRecordingStateChange(false);
    onStop();
  };
  const { toast } = useToast();

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Recording Error",
        description: error,
      });
    }
  }, [error]);

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
      {isRecording && (
        <div className="flex items-center gap-2 bg-red-100 px-4 py-2 rounded-full">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-red-600 font-medium">Recording...</span>
        </div>
      )}
      <Button
        size="lg"
        variant={isRecording ? "destructive" : "default"}
        onClick={isRecording ? handleStopRecording : handleStartRecording}
        className="h-16 px-8 rounded-full flex items-center gap-2"
      >
        {isRecording ? (
          <>
            <Square className="h-6 w-6" />
            <span>Stop Recording</span>
          </>
        ) : (
          <>
            <Mic className="h-6 w-6" />
            <span>Start Recording</span>
          </>
        )}
      </Button>
      {!isRecording && (
        <p className="text-sm text-gray-500 text-center mt-2">
          Click to start recording your conversation
        </p>
      )}
    </div>
  );
}
