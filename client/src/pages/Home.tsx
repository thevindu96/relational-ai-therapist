import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ConversationPanel from "../components/ConversationPanel";
import AnalysisPanel from "../components/AnalysisPanel";
import RecordButton from "../components/RecordButton";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [hasStartedSession, setHasStartedSession] = useState(false);
  const [conversation, setConversation] = useState<Array<{
    text: string;
    speaker: number;
    timestamp: number;
  }>>([]);
  const [analysis, setAnalysis] = useState<Array<{
    rating: "bad" | "medium" | "good";
    feedback: string;
    utteranceIndex: number;
  }>>([]);

  const handleStartRecording = () => {
    setIsRecording(true);
    setHasStartedSession(true);
    setConversation([]);
    setAnalysis([]);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  return (
    <div className="container mx-auto p-4 min-h-screen">
      {!hasStartedSession ? (
        <Card className="max-w-2xl mx-auto mt-20 p-8">
          <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Welcome to your relational AI-therapist
          </h1>
          <p className="text-lg text-gray-700 mb-8">
            Hit record below to begin a conversation between you and someone else
            where you both are trying to navigate a conflict. You'll see live tips
            on how good you are at communicating your needs and understanding the
            other person's needs without criticism!
          </p>
          <Button
            onClick={handleStartRecording}
            className="w-full py-6 text-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            Start Recording
          </Button>
        </Card>
      ) : (
        <div className="h-[90vh]">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50}>
              <ConversationPanel conversation={conversation} />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={50}>
              <AnalysisPanel analysis={analysis} conversation={conversation} />
            </ResizablePanel>
          </ResizablePanelGroup>
          <RecordButton
            isRecording={isRecording}
            onStop={handleStopRecording}
            onTranscript={(text, speaker) => {
              setConversation((prev) => [
                ...prev,
                { text, speaker, timestamp: Date.now() },
              ]);
            }}
            onAnalysis={(feedback) => {
              setAnalysis((prev) => [
                ...prev,
                {
                  ...feedback,
                  utteranceIndex: conversation.length,
                },
              ]);
            }}
          />
        </div>
      )}
    </div>
  );
}
