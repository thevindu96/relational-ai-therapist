import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ConversationPanelProps {
  conversation: Array<{
    text: string;
    speaker: number;
    timestamp: number;
  }>;
}

export default function ConversationPanel({ conversation }: ConversationPanelProps) {
  return (
    <Card className="h-full border-0 rounded-none p-4">
      <h2 className="text-xl font-semibold mb-4">Conversation Transcript</h2>
      <ScrollArea className="h-[calc(100vh-10rem)]">
        <div className="space-y-4">
          {conversation.map((utterance, index) => (
            <div
              key={utterance.timestamp}
              className={`p-3 rounded-lg ${
                utterance.speaker === 1
                  ? "bg-blue-100 ml-8"
                  : "bg-purple-100 mr-8"
              }`}
              data-utterance-index={index}
            >
              <div className="font-medium mb-1">
                Speaker {utterance.speaker === 1 ? "One" : "Two"}
              </div>
              <div className="text-gray-700">{utterance.text}</div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
