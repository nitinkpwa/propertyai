import OpenAI from "openai";

export const OPENAI_MODEL = "gpt-4o-mini";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  if (!client) {
    client = new OpenAI({ apiKey });
  }
  return client;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export type ChatRole = "system" | "user" | "assistant";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export function toOpenAIMessages(
  history: ConversationMessage[],
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  return history.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}
