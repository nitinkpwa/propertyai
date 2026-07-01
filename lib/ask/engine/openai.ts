import type OpenAI from "openai";
import {
  getOpenAIClient,
  OPENAI_MODEL,
  toOpenAIMessages,
  type ConversationMessage,
} from "../openai-client";
import type { AskSection } from "../types";
import {
  AREA_IQ_SYSTEM_PROMPT,
  BUILDER_PROMPT,
  COMPARE_PROMPT,
  FINANCE_PROMPT,
  GENERAL_CHAT_PROMPT,
  INVESTMENT_PROMPT,
  KNOWLEDGE_PROMPT,
  LOCALITY_PROMPT,
  MARKET_TREND_PROMPT,
  PROPERTY_ANALYSIS_PROMPT,
  PROPERTY_SEARCH_SUMMARY_PROMPT,
  SELLING_PROMPT,
  UNRELATED_PROMPT,
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
    ...toOpenAIMessages(history.slice(-8)),
    { role: "user", content: user },
  ];

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.1,
      max_tokens: 900,
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
    maxTokens?: number;
  } = {},
): Promise<string> {
  const openai = getOpenAIClient();
  const { history = [], extraContext, maxTokens = 1600 } = options;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: system + (extraContext ?? "") },
    ...toOpenAIMessages(history.slice(-10)),
    { role: "user", content: userMessage },
  ];

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.65,
      max_tokens: maxTokens,
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
    id?: string;
    name: string;
    location: string;
    price: number;
    bhk: number;
    growthScore: number | null;
    rentalYield: number | null;
    builderName?: string;
    area?: number;
  }>,
): string {
  if (listings.length === 0) return "";

  const rows = listings
    .slice(0, 10)
    .map((p) => {
      const priceLakh = Math.round(p.price / 100_000);
      const sqft =
        p.area && p.area > 0
          ? ` | ₹${Math.round(p.price / p.area).toLocaleString("en-IN")}/sqft`
          : "";
      const builder = p.builderName ? ` | Builder: ${p.builderName}` : "";
      const id = p.id ? `[ID:${p.id}] ` : "";
      const score =
        p.growthScore !== null ? `Score ${p.growthScore}/100` : "Score N/A";
      const yieldText =
        p.rentalYield !== null ? `Yield ${p.rentalYield}%` : "Yield N/A";
      return `- ${id}${p.name} | ${p.location} | ₹${priceLakh}L | ${p.bhk} BHK${sqft} | ${score} | ${yieldText}${builder}`;
    })
    .join("\n");

  return `\n\nCURRENT LISTINGS IN OUR DATABASE (${listings.length} total, showing up to 10):\n${rows}\n\nYou may ONLY recommend these specific properties. Do not mention any other projects as available listings.`;
}

export function buildSinglePropertyContext(property: {
  id: string;
  name: string;
  location: string;
  city: string;
  price: number;
  bhk: number;
  area: number;
  builderName: string;
  growthScore: number | null;
  rentalYield: number | null;
  possession: string;
  propertyType: string;
}): string {
  const priceLakh = Math.round(property.price / 100_000);
  const pricePerSqft =
    property.area > 0 ? Math.round(property.price / property.area) : null;

  return `\n\nPROPERTY IN DATABASE — USE THESE FACTS:\n- ID: ${property.id}\n- Name: ${property.name}\n- Location: ${property.location}, ${property.city}\n- Price: ₹${priceLakh} lakh${pricePerSqft ? ` (₹${pricePerSqft.toLocaleString("en-IN")}/sqft)` : ""}\n- ${property.bhk} BHK | ${property.area} sqft\n- Builder: ${property.builderName}\n- Possession: ${property.possession}\n- Type: ${property.propertyType}\n- AreaIQ Score: ${property.growthScore !== null ? `${property.growthScore}/100` : "N/A"}\n- Rental Yield: ${property.rentalYield !== null ? `${property.rentalYield}%` : "N/A"}`;
}

export function parseMarkdownSections(content: string): AskSection[] {
  const sections: AskSection[] = [];
  const lines = content.split("\n");
  let currentTitle = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)/);
    if (headingMatch) {
      if (currentTitle && currentContent.length > 0) {
        sections.push({
          title: currentTitle.replace(/^[✅⚠️📊🏗️💰]\s*/, "").trim(),
          content: currentContent.join("\n").trim(),
        });
      }
      currentTitle = headingMatch[1].trim();
      currentContent = [];
    } else if (currentTitle) {
      currentContent.push(line);
    }
  }

  if (currentTitle && currentContent.length > 0) {
    sections.push({
      title: currentTitle.replace(/^[✅⚠️📊🏗️💰]\s*/, "").trim(),
      content: currentContent.join("\n").trim(),
    });
  }

  return sections.filter((s) => s.content.length > 0);
}

export function extractPropertyRationales(
  answer: string,
  propertyNames: string[],
): Record<string, string> {
  const rationales: Record<string, string> = {};

  for (const name of propertyNames) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(
        `###\\s*#?\\d*\\s*${escaped}[\\s\\S]*?\\*\\*Why (?:it fits|ranked here):\\*\\*\\s*(.+?)(?=\\n-|\\n###|$)`,
        "i",
      ),
      new RegExp(
        `###\\s*${escaped}[\\s\\S]*?\\*\\*Why it fits:\\*\\*\\s*(.+?)(?=\\n-|\\n###|$)`,
        "i",
      ),
      new RegExp(
        `${escaped}[\\s\\S]*?\\*\\*Why it fits:\\*\\*\\s*(.+?)(?=\\n|$)`,
        "i",
      ),
    ];

    for (const pattern of patterns) {
      const match = answer.match(pattern);
      if (match?.[1]) {
        rationales[name] = match[1].trim();
        break;
      }
    }
  }

  return rationales;
}

export async function generateAreaIQResponse(
  taskPrompt: string,
  userMessage: string,
  options: {
    history?: ConversationMessage[];
    listingsContext?: string;
    memoryContext?: string;
    propertyContext?: string;
    maxTokens?: number;
  } = {},
): Promise<string> {
  const extraContext = [
    options.memoryContext ?? "",
    options.propertyContext ?? "",
    options.listingsContext ?? "",
  ].join("");

  return completeText(`${AREA_IQ_SYSTEM_PROMPT}\n\n${taskPrompt}`, userMessage, {
    history: options.history,
    extraContext,
    maxTokens: options.maxTokens,
  });
}

export async function generatePropertySearchSummary(
  userMessage: string,
  listingsContext: string,
  exactMatch: boolean,
  history: ConversationMessage[] = [],
  memoryContext = "",
): Promise<string> {
  const instruction = exactMatch
    ? "Exact matches were found in our database."
    : "No exact matches were found. Similar/closest listings from our database are being shown instead.";

  return generateAreaIQResponse(
    PROPERTY_SEARCH_SUMMARY_PROMPT,
    `${userMessage}\n\n${instruction}`,
    { history, listingsContext, memoryContext },
  );
}

export async function generateUnknownClarification(
  message: string,
  history: ConversationMessage[] = [],
  memoryContext = "",
): Promise<string> {
  return generateAreaIQResponse(UNKNOWN_CLARIFICATION_PROMPT, message, {
    history,
    memoryContext,
  });
}

export {
  KNOWLEDGE_PROMPT,
  LOCALITY_PROMPT,
  BUILDER_PROMPT,
  INVESTMENT_PROMPT,
  FINANCE_PROMPT,
  GENERAL_CHAT_PROMPT,
  PROPERTY_ANALYSIS_PROMPT,
  COMPARE_PROMPT,
  MARKET_TREND_PROMPT,
  SELLING_PROMPT,
  UNRELATED_PROMPT,
};
