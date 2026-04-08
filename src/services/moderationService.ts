import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Please set it in your environment variables.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function moderateContent(content: string): Promise<{ isSafe: boolean; reason?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'undefined') {
    console.warn("GEMINI_API_KEY is missing or undefined. Skipping AI moderation.");
    return { isSafe: true };
  }

  try {
    const ai = getAI();
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
