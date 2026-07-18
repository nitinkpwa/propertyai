import { parseMarkdownSections } from "@/lib/ask/markdown";
import type { AskChatMessage } from "@/lib/ask/conversations/types";
import type { AskTurn } from "@/lib/ask/types";

export function turnFromMessage(message: AskChatMessage, userQuery = ""): AskTurn {
  const content = message.content ?? "";
  const sections = parseMarkdownSections(content);
  const headline =
    content
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
    subtext: message.isSimilar
      ? "Showing closest matches from AreaIQ database."
      : null,
    aiContent: content,
    sections,
    stats: message.stats ?? null,
    listings: message.properties ?? [],
    propertyRationales: message.propertyRationales ?? {},
    isSimilar: message.isSimilar ?? false,
    quickActions: message.quickActions ?? [],
    followUps: message.followUps ?? [],
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
