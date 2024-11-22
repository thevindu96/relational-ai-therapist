// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user

async function fetchWithError(url: string, options: RequestInit) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function transcribeAudio(audioBlob: Blob): Promise<{ text: string }> {
  const formData = new FormData();
  formData.append("audio", audioBlob);

  return fetchWithError("/api/transcribe", {
    method: "POST",
    body: formData,
  });
}

export async function analyzeTranscript(text: string): Promise<{
  rating: "bad" | "medium" | "good";
  feedback: string;
}> {
  return fetchWithError("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });
}
