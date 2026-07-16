import type { PropertyContext } from "@/lib/ask/engine/types";
import type { AskEngineIntent } from "@/lib/ask/engine/types";
import type { AskSearchStats, AskIntent } from "@/lib/ask/types";
import type { ListingProperty } from "@/lib/properties/types";

export interface AskChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  properties?: ListingProperty[];
  propertyRationales?: Record<string, string>;
  followUps?: string[];
  quickActions?: string[];
  intent?: AskEngineIntent;
  uiIntent?: AskIntent;
  stats?: AskSearchStats | null;
  isSimilar?: boolean;
  suggestedPropertyIds?: string[];
  /** Extracted entities from engine (optional; older messages may omit) */
  location?: string | null;
  builder?: string | null;
}

export interface AskConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  propertyContext?: PropertyContext | null;
  messages: AskChatMessage[];
  suggestedPropertyIds: string[];
}

export interface AskConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview?: string;
}

export type ConversationTimeGroup = "today" | "yesterday" | "last7" | "older";

export interface GroupedConversations {
  today: AskConversationSummary[];
  yesterday: AskConversationSummary[];
  last7: AskConversationSummary[];
  older: AskConversationSummary[];
}

export const GUEST_CONVERSATIONS_KEY = "areaiq-guest-conversations-v1";
export const GUEST_ACTIVE_CONVERSATION_KEY = "areaiq-active-conversation-id";
export const RECENT_SEARCHES_KEY = "areaiq-recent-searches-v1";
export const MAX_GUEST_CONVERSATIONS = 20;
export const MAX_RECENT_SEARCHES = 8;
