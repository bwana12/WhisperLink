import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function moderateContent(content: string): Promise<{ isSafe: boolean; reason?: string }> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is missing. Skipping AI moderation.");
    return { isSafe: true };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following anonymous message for harmful content, hate speech, harassment, or explicit material. 
      Respond ONLY with a JSON object in this format: {"isSafe": boolean, "reason": string | null}
      
      Message: "${content}"`,
      config: {
        responseMimeType: "application/json",
      }
    });

    const result = JSON.parse(response.text || '{"isSafe": true}');
    return result;
  } catch (error) {
    console.error("Moderation error:", error);
    return { isSafe: true }; // Fallback to safe if AI fails
  }
}
