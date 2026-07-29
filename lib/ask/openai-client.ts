import "server-only";
import type { ConversationMessage } from "./types";

export type { ConversationMessage };

export const OPENAI_MODEL = "gpt-4o-mini";

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatCompletionUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

export type ChatCompletionChoice = {
  index: number;
  message: { role: string; content: string | null };
  finish_reason: string | null;
};

export type ChatCompletion = {
  id: string;
  object: string;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: ChatCompletionUsage;
};

export type ChatCompletionChunk = {
  id: string;
  object: string;
  model: string;
  choices: Array<{
    index: number;
    delta: { role?: string; content?: string | null };
    finish_reason: string | null;
  }>;
};

type CreateParams = {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" | "text" };
  stream?: boolean;
};

/**
 * Minimal OpenAI Chat Completions client (fetch-based).
 * Replaces the full `openai` SDK to keep the Cloudflare Worker under 3 MiB.
 */
class OpenAIChatClient {
  constructor(private readonly apiKey: string) {}

  chat = {
    completions: {
      create: async (
        params: CreateParams,
      ): Promise<ChatCompletion | AsyncIterable<ChatCompletionChunk>> => {
        if (params.stream) {
          return this.createStream(params);
        }
        return this.createOnce(params);
      },
    },
  };

  private async createOnce(params: CreateParams): Promise<ChatCompletion> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...params, stream: false }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenAI HTTP ${res.status}: ${body.slice(0, 400)}`);
    }

    return (await res.json()) as ChatCompletion;
  }

  private async createStream(
    params: CreateParams,
  ): Promise<AsyncIterable<ChatCompletionChunk>> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ ...params, stream: true }),
    });

    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenAI HTTP ${res.status}: ${body.slice(0, 400)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    async function* iterate(): AsyncGenerator<ChatCompletionChunk> {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            yield JSON.parse(data) as ChatCompletionChunk;
          } catch {
            /* skip malformed SSE chunks */
          }
        }
      }
    }

    return iterate();
  }
}

export type AreaIQOpenAI = OpenAIChatClient;

let client: OpenAIChatClient | null = null;

export function getOpenAIClient(): OpenAIChatClient {
  const t0 = performance.now();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  if (!client) {
    client = new OpenAIChatClient(apiKey);
    // Dynamic import kept out of page render; log first init only.
    console.warn("[perf] openai.client.init", {
      durationMs: Math.round((performance.now() - t0) * 100) / 100,
      note: "Should only run inside Ask/API handlers — never during page SSR",
    });
  }
  return client;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function toOpenAIMessages(
  history: ConversationMessage[],
): ChatMessage[] {
  return history.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

/** Non-streaming chat completion helper */
export async function createChatCompletion(
  params: Omit<CreateParams, "stream">,
): Promise<ChatCompletion> {
  const client = getOpenAIClient();
  const result = await client.chat.completions.create({
    ...params,
    stream: false,
  });
  if (!result || typeof result !== "object" || !("choices" in result)) {
    throw new Error("OpenAI returned an unexpected response");
  }
  return result;
}
