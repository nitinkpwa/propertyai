import type { AskConversation, AskConversationSummary } from "./types";
import {
  GUEST_ACTIVE_CONVERSATION_KEY,
  GUEST_CONVERSATIONS_KEY,
  MAX_GUEST_CONVERSATIONS,
  RECENT_SEARCHES_KEY,
  MAX_RECENT_SEARCHES,
} from "./types";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to write ${key}:`, error);
  }
}

export function loadGuestConversations(): AskConversation[] {
  return readJson<AskConversation[]>(GUEST_CONVERSATIONS_KEY, []);
}

export function saveGuestConversations(conversations: AskConversation[]): void {
  const sorted = [...conversations]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, MAX_GUEST_CONVERSATIONS);
  writeJson(GUEST_CONVERSATIONS_KEY, sorted);
}

export function loadGuestConversation(id: string): AskConversation | null {
  return loadGuestConversations().find((c) => c.id === id) ?? null;
}

export function upsertGuestConversation(conversation: AskConversation): void {
  const existing = loadGuestConversations();
  const index = existing.findIndex((c) => c.id === conversation.id);
  if (index >= 0) {
    existing[index] = conversation;
  } else {
    existing.unshift(conversation);
  }
  saveGuestConversations(existing);
}

export function deleteGuestConversation(id: string): void {
  saveGuestConversations(loadGuestConversations().filter((c) => c.id !== id));
}

export function getGuestActiveConversationId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(GUEST_ACTIVE_CONVERSATION_KEY);
}

export function setGuestActiveConversationId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) {
    localStorage.setItem(GUEST_ACTIVE_CONVERSATION_KEY, id);
  } else {
    localStorage.removeItem(GUEST_ACTIVE_CONVERSATION_KEY);
  }
}

export function toConversationSummary(conversation: AskConversation): AskConversationSummary {
  const lastUser = [...conversation.messages].reverse().find((m) => m.role === "user");
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messageCount: conversation.messages.length,
    preview: lastUser?.content,
  };
}

export function loadRecentSearches(): string[] {
  return readJson<string[]>(RECENT_SEARCHES_KEY, []);
}

export function addRecentSearch(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return loadRecentSearches();

  const updated = [trimmed, ...loadRecentSearches().filter((q) => q !== trimmed)].slice(
    0,
    MAX_RECENT_SEARCHES,
  );
  writeJson(RECENT_SEARCHES_KEY, updated);
  return updated;
}
