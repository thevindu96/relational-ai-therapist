import type { Express, Request } from "express";
import OpenAI from "openai";
import multer from "multer";

// Extend Express Request type to include multer's file property
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function registerRoutes(app: Express) {
  app.post("/api/transcribe", upload.single("audio"), async (req: MulterRequest, res) => {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      console.debug('[Server] Received audio chunk:', req.file.mimetype, req.file.size);

      const tempFile = new File(
        [req.file.buffer],
        'audio.webm',  // Use webm since that's what the browser is sending
        { type: 'audio/webm' }
      );

      const transcription = await openai.audio.transcriptions.create({
        file: tempFile,  // Use tempFile instead of audioFile
        model: "whisper-1",
        response_format: "json",
      });

      console.debug('[Server] Transcription received:', transcription.text);
      res.json({ text: transcription.text });
    } catch (error) {
      console.error("Transcription error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to transcribe audio"
      });
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

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content in OpenAI response");
      }
      const analysis = JSON.parse(content);
      res.json(analysis);
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ error: "Failed to analyze text" });
    }
  });
}
