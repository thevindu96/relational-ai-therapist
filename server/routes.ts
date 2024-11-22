import type { Express } from "express";
import OpenAI from "openai";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function registerRoutes(app: Express) {
  app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const transcription = await openai.audio.transcriptions.create({
        file: req.file.buffer,
        model: "whisper-1",
      });

      res.json({ text: transcription.text });
    } catch (error) {
      console.error("Transcription error:", error);
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });

  app.post("/api/analyze", async (req, res) => {
    try {
      const { text } = req.body;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert in Non-Violent Communication (NVC) by Marshall Rosenberg. Analyze the given text and rate it as 'bad', 'medium', or 'good' based on NVC principles. Provide brief, constructive feedback on how it could be improved. Return the response as JSON with 'rating' and 'feedback' fields.",
          },
          {
            role: "user",
            content: text,
          },
        ],
        response_format: { type: "json_object" },
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      res.json(analysis);
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ error: "Failed to analyze text" });
    }
  });
}
