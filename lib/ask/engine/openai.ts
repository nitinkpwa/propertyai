import type OpenAI from "openai";
import {
  getOpenAIClient,
  OPENAI_MODEL,
  toOpenAIMessages,
  type ConversationMessage,
} from "../openai-client";
import {
  AREA_IQ_SYSTEM_PROMPT,
  BUILDER_PROMPT,
  FINANCE_PROMPT,
  GENERAL_CHAT_PROMPT,
  INVESTMENT_PROMPT,
  KNOWLEDGE_PROMPT,
  LOCALITY_PROMPT,
  PROPERTY_SEARCH_SUMMARY_PROMPT,
  UNKNOWN_CLARIFICATION_PROMPT,
  AI_UNAVAILABLE_MESSAGE,
} from "./prompts";
import { logAsk } from "./logger";

export class AskAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AskAIError";
  }
}

export async function completeJSON<T>(
  system: string,
  user: string,
  history: ConversationMessage[] = [],
): Promise<T> {
  const openai = getOpenAIClient();

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    ...toOpenAIMessages(history.slice(-6)),
    { role: "user", content: user },
  ];

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.1,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages,
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) {
      throw new AskAIError("OpenAI returned an empty classification response");
    }

    logAsk({
      event: "openai_json_response",
      usage: response.usage,
      model: OPENAI_MODEL,
    });

    return JSON.parse(raw) as T;
  } catch (error) {
    logAsk({
      event: "openai_json_error",
      level: "error",
      error: error instanceof Error ? error.message : String(error),
    });
    if (error instanceof AskAIError) throw error;
    throw new AskAIError(AI_UNAVAILABLE_MESSAGE);
  }
}

export async function completeText(
  system: string,
  userMessage: string,
  options: {
    history?: ConversationMessage[];
    extraContext?: string;
  } = {},
): Promise<string> {
  const openai = getOpenAIClient();
  const { history = [], extraContext } = options;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: system + (extraContext ?? "") },
    ...toOpenAIMessages(history.slice(-8)),
    { role: "user", content: userMessage },
  ];

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.7,
      max_tokens: 900,
      messages,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new AskAIError("OpenAI returned an empty text response");
    }

    logAsk({
      event: "openai_text_response",
      usage: response.usage,
      model: OPENAI_MODEL,
    });

    return content;
  } catch (error) {
    logAsk({
      event: "openai_text_error",
      level: "error",
      error: error instanceof Error ? error.message : String(error),
    });
    if (error instanceof AskAIError) throw error;
    throw new AskAIError(AI_UNAVAILABLE_MESSAGE);
  }
}

export function buildListingsContext(
  listings: Array<{
    name: string;
    location: string;
    price: number;
    bhk: number;
    growthScore: number;
    rentalYield: number;
  }>,
): string {
  if (listings.length === 0) return "";

  const rows = listings
    .slice(0, 10)
    .map(
      (p) =>
        `- ${p.name} | ${p.location} | ₹${Math.round(p.price / 100_000)}L | ${p.bhk} BHK | AreaIQ Score ${p.growthScore} | Yield ${p.rentalYield}%`,
    )
    .join("\n");

  return `\n\nCURRENT LISTINGS IN OUR DATABASE (${listings.length} total, showing up to 10):\n${rows}\n\nYou may ONLY recommend these specific properties. Do not mention any other projects as available listings.`;
}

export async function generateAreaIQResponse(
  taskPrompt: string,
  userMessage: string,
  options: {
    history?: ConversationMessage[];
    listingsContext?: string;
  } = {},
): Promise<string> {
  return completeText(`${AREA_IQ_SYSTEM_PROMPT}\n\n${taskPrompt}`, userMessage, {
    history: options.history,
    extraContext: options.listingsContext,
  });
}

export async function generatePropertySearchSummary(
  userMessage: string,
  listingsContext: string,
  exactMatch: boolean,
  history: ConversationMessage[] = [],
): Promise<string> {
  const instruction = exactMatch
    ? "Exact matches were found in our database."
    : "No exact matches were found. Similar/closest listings from our database are being shown instead.";

  return generateAreaIQResponse(
    PROPERTY_SEARCH_SUMMARY_PROMPT,
    `${userMessage}\n\n${instruction}`,
    { history, listingsContext },
  );
}

export async function generateUnknownClarification(
  message: string,
  history: ConversationMessage[] = [],
): Promise<string> {
  return generateAreaIQResponse(UNKNOWN_CLARIFICATION_PROMPT, message, { history });
}

export {
  KNOWLEDGE_PROMPT,
  LOCALITY_PROMPT,
  BUILDER_PROMPT,
  INVESTMENT_PROMPT,
  FINANCE_PROMPT,
  GENERAL_CHAT_PROMPT,
};
