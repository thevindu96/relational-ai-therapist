import { useAudioRecording } from "../hooks/useAudioRecording";
import { Button } from "@/components/ui/button";
import { Mic, Square } from "lucide-react";

interface RecordButtonProps {
  isRecording: boolean;
  onStop: () => void;
  onTranscript: (text: string, speaker: number) => void;
  onAnalysis: (analysis: { rating: "bad" | "medium" | "good"; feedback: string }) => void;
}

export default function RecordButton({
  isRecording,
  onStop,
  onTranscript,
  onAnalysis,
}: RecordButtonProps) {
  const { startRecording, stopRecording } = useAudioRecording({
    onTranscript,
    onAnalysis,
  });

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
      <Button
        size="lg"
        variant={isRecording ? "destructive" : "default"}
        onClick={isRecording ? () => {
          stopRecording();
          onStop();
        } : startRecording}
        className="h-16 w-16 rounded-full"
      >
        {isRecording ? (
          <Square className="h-6 w-6" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </Button>
    </div>
  );
}
