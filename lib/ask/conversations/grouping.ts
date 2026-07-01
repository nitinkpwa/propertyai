import type { AskConversationSummary, ConversationTimeGroup, GroupedConversations } from "./types";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getConversationTimeGroup(updatedAt: string): ConversationTimeGroup {
  const date = new Date(updatedAt);
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const last7 = new Date(today);
  last7.setDate(last7.getDate() - 7);

  const day = startOfDay(date);

  if (day.getTime() === today.getTime()) return "today";
  if (day.getTime() === yesterday.getTime()) return "yesterday";
  if (day.getTime() >= last7.getTime()) return "last7";
  return "older";
}

export function groupConversationsByTime(
  conversations: AskConversationSummary[],
): GroupedConversations {
  const sorted = [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const groups: GroupedConversations = {
    today: [],
    yesterday: [],
    last7: [],
    older: [],
  };

  for (const conversation of sorted) {
    groups[getConversationTimeGroup(conversation.updatedAt)].push(conversation);
  }

  return groups;
}

export const TIME_GROUP_LABELS: Record<ConversationTimeGroup, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 Days",
  older: "Older",
};
