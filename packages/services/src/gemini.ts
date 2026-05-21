import { GoogleGenAI } from "@google/genai";
import { servicesEnv } from "./env";

const printHint =
  "Edit this portrait for a photobooth. Output a single portrait photo in 4:6 aspect ratio (4 inches wide by 6 inches tall), suitable for a 6x4 dye-sub print. Keep the subject centred and likeness recognizable.";

export async function applyImageFilter(
  imageBuffer: Buffer,
  mimeType: string,
  prompt: string,
  negativePrompt?: string | null
): Promise<Buffer> {
  if (!servicesEnv.geminiApiKey) {
    if (servicesEnv.nodeEnv === "development") return imageBuffer;
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const fullPrompt = negativePrompt
    ? `${prompt}\n\n${printHint}\n\nAvoid: ${negativePrompt}`
    : `${prompt}\n\n${printHint}`;

  const ai = new GoogleGenAI({ apiKey: servicesEnv.geminiApiKey });

  const response = await ai.models.generateContent({
    model: servicesEnv.geminiImageModel,
    contents: [
      { text: fullPrompt },
      {
        inlineData: {
          mimeType,
          data: imageBuffer.toString("base64"),
        },
      },
    ],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio: "2:3",
        imageSize: "2K",
      },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, "base64");
    }
  }

  throw new Error("No image returned from Gemini model");
}
