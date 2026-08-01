import { parseMarkdownSections } from "@/lib/ask/markdown";
import type { AskChatMessage } from "@/lib/ask/conversations/types";
import type { AskTurn } from "@/lib/ask/types";

export function turnFromMessage(message: AskChatMessage, userQuery = ""): AskTurn {
  const content = message.content ?? "";
  const sections = message.streaming ? [] : parseMarkdownSections(content);
  const aiDegraded = Boolean(message.aiDegraded);

  const headline = message.streaming
    ? "AreaIQ Intelligence"
    : aiDegraded
      ? "AreaIQ Intelligence"
      : content
          .split("\n")
          .find((l) => l.startsWith("##"))
          ?.replace(/^##\s+/, "")
          .replace(/^[✅⚠️📊🏗️💰]\s*/, "")
          .trim() || "AreaIQ Intelligence";

  return {
    id: message.id,
    userQuery,
    intent: message.uiIntent ?? "knowledge",
    headline,
    subtext: message.streaming
      ? "We're still searching verified inventory…"
      : aiDegraded
        ? "Built from live verified inventory — AI reasoning is catching up."
        : message.isSimilar
          ? "Showing closest matches from AreaIQ database."
          : null,
    aiContent: content,
    sections,
    stats: message.stats ?? null,
    listings: message.properties ?? [],
    propertyRationales: message.propertyRationales ?? {},
    isSimilar: message.isSimilar ?? false,
    quickActions: message.streaming ? [] : message.quickActions ?? [],
    followUps: message.streaming ? [] : message.followUps ?? [],
    intelligenceLevel: message.intelligenceLevel,
    missingSignals: message.missingSignals,
    aiDegraded,
    aiNotice: message.aiNotice ?? null,
    intelligenceDigest: message.intelligenceDigest ?? null,
  };
}

export function getLatestAssistantMessage(
  messages: AskChatMessage[],
): AskChatMessage | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") return messages[i];
  }
  return null;
}

export function pairMessages(messages: AskChatMessage[]) {
  const pairs: Array<{ user?: AskChatMessage; assistant?: AskChatMessage }> = [];
  for (const msg of messages) {
    if (msg.role === "user") {
      pairs.push({ user: msg });
    } else if (pairs.length > 0 && !pairs[pairs.length - 1].assistant) {
      pairs[pairs.length - 1].assistant = msg;
    } else {
      pairs.push({ assistant: msg });
    }
  }
  return pairs;
}
