import Anthropic from "@anthropic-ai/sdk";

let clientInstance: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!clientInstance) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY environment variable is required for AI translation."
      );
    }
    clientInstance = new Anthropic({ apiKey });
  }
  return clientInstance;
}
