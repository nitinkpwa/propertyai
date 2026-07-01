import type { AskEngineResponse } from "@/lib/ask/engine/types";
import type { AskTurn } from "@/lib/ask/types";
import { mapEngineResponseToTurn } from "@/lib/ask/client";
import type { AskChatMessage, AskConversation } from "./types";

export function conversationToHistory(conversation: AskConversation): Array<{
  role: "user" | "assistant";
  content: string;
}> {
  return conversation.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

export function buildAssistantMessage(
  userQuery: string,
  response: AskEngineResponse,
): { turn: AskTurn; message: AskChatMessage } {
  const turn = mapEngineResponseToTurn(userQuery, response);
  const suggestedPropertyIds = response.properties.map((p) => p.id);

  const message: AskChatMessage = {
    id: turn.id,
    role: "assistant",
    content: response.answer,
    timestamp: new Date().toISOString(),
    properties: response.properties,
    propertyRationales: response.propertyRationales,
    followUps: response.followUpQuestions,
    quickActions: response.suggestions,
    intent: response.intent,
    uiIntent: turn.intent,
    stats: response.stats,
    isSimilar: response.isSimilar,
    suggestedPropertyIds,
  };

  return { turn, message };
}

export function buildUserMessage(content: string): AskChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "user",
    content,
    timestamp: new Date().toISOString(),
  };
}

export function mergeSuggestedPropertyIds(
  conversation: AskConversation,
  newIds: string[],
): string[] {
  const merged = new Set([...conversation.suggestedPropertyIds, ...newIds]);
  return [...merged];
}

export function createEmptyConversation(
  title = "New conversation",
  propertyContext?: AskConversation["propertyContext"],
): AskConversation {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title,
    createdAt: now,
    updatedAt: now,
    propertyContext: propertyContext ?? null,
    messages: [],
    suggestedPropertyIds: [],
  };
}
