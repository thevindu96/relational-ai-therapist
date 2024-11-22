import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface AnalysisPanelProps {
  analysis: Array<{
    rating: "bad" | "medium" | "good";
    feedback: string;
    utteranceIndex: number;
  }>;
  conversation: Array<{
    text: string;
    speaker: number;
  }>;
}

export default function AnalysisPanel({
  analysis,
  conversation,
}: AnalysisPanelProps) {
  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "good":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "bad":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className="h-full border-0 rounded-none p-4">
      <h2 className="text-xl font-semibold mb-4">NVC Analysis</h2>
      <ScrollArea className="h-[calc(100vh-10rem)]">
        <div className="space-y-4">
          {analysis.map((item, index) => (
            <div
              key={index}
              className="p-4 border rounded-lg"
              onMouseEnter={() => {
                const utterance = document.querySelector(
                  `[data-utterance-index="${item.utteranceIndex}"]`,
                );
                utterance?.classList.add("ring-2", "ring-blue-500");
              }}
              onMouseLeave={() => {
                const utterance = document.querySelector(
                  `[data-utterance-index="${item.utteranceIndex}"]`,
                );
                utterance?.classList.remove("ring-2", "ring-blue-500");
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Badge className={getRatingColor(item.rating)}>
                  {item.rating.toUpperCase()}
                </Badge>
                <span className="text-sm text-gray-500">
                  Speaker {conversation[item.utteranceIndex]?.speaker === 1 ? "One" : "Two"}
                </span>
              </div>
              <p className="text-gray-700">{item.feedback}</p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
