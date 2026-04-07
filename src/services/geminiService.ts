import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function moderateContent(content: string): Promise<{ isSafe: boolean; reason?: string }> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following message for hate speech, extreme profanity, bullying, or harassment. 
      Respond ONLY with a JSON object in this format: {"isSafe": boolean, "reason": string | null}.
      
      Message: "${content}"`,
      config: {
        responseMimeType: "application/json",
      }
    });

    const result = JSON.parse(response.text || '{"isSafe": true, "reason": null}');
    return result;
  } catch (error) {
    console.error("AI Moderation Error:", error);
    // Fallback to safe if AI fails, or implement a basic regex filter
    return { isSafe: true };
  }
}
