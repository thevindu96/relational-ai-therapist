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
}

export default function RecordButton({
  isRecording,
  onStop,
  onTranscript,
  onAnalysis,
}: RecordButtonProps) {
  const { startRecording, stopRecording, error } = useAudioRecording({
    onTranscript,
    onAnalysis,
  });
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
