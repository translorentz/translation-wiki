import OpenAI from "openai";

let clientInstance: OpenAI | null = null;

export function getTranslationClient(): OpenAI {
  if (!clientInstance) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error(
        "DEEPSEEK_API_KEY environment variable is required for AI translation."
      );
    }
    clientInstance = new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com",
    });
  }
  return clientInstance;
}
