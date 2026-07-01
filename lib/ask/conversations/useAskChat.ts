"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  queryAskEngine,
  type PropertyContext,
} from "@/lib/ask/client";
import { generateConversationTitle } from "@/lib/ask/conversations/titles";
import {
  addRecentSearch,
  deleteGuestConversation,
  getGuestActiveConversationId,
  loadGuestConversation,
  loadGuestConversations,
  loadRecentSearches,
  setGuestActiveConversationId,
  toConversationSummary,
  upsertGuestConversation,
} from "@/lib/ask/conversations/guestStorage";
import {
  buildAssistantMessage,
  buildUserMessage,
  conversationToHistory,
  createEmptyConversation,
  mergeSuggestedPropertyIds,
} from "@/lib/ask/conversations/helpers";
import type {
  AskChatMessage,
  AskConversation,
  AskConversationSummary,
} from "@/lib/ask/conversations/types";
import { getTypingStatus } from "@/lib/ask/responses";

type TypingPhase = "understanding" | "searching" | "responding";

async function fetchRemoteSummaries(): Promise<AskConversationSummary[]> {
  const res = await fetch("/api/ask/conversations");
  if (!res.ok) return [];
  const data = (await res.json()) as { conversations: AskConversationSummary[] };
  return data.conversations ?? [];
}

async function fetchRemoteConversation(id: string): Promise<AskConversation | null> {
  const res = await fetch(`/api/ask/conversations/${id}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { conversation: AskConversation };
  return data.conversation ?? null;
}

async function persistRemoteConversation(conversation: AskConversation): Promise<void> {
  await fetch(`/api/ask/conversations/${conversation.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation }),
  });
}

async function createRemoteConversation(
  title: string,
  propertyContext?: PropertyContext | null,
): Promise<AskConversation | null> {
  const res = await fetch("/api/ask/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, propertyContext }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { conversation: AskConversation };
  return data.conversation ?? null;
}

export function useAskChat(initialPropertyContext?: PropertyContext | null) {
  const { user, loading: authLoading } = useAuth();
  const isLoggedIn = Boolean(user);

  const [conversations, setConversations] = useState<AskConversationSummary[]>([]);
  const [activeConversation, setActiveConversation] = useState<AskConversation | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [propertyContext, setPropertyContext] = useState<PropertyContext | null>(
    initialPropertyContext ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [typingPhase, setTypingPhase] = useState<TypingPhase>("understanding");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const refreshConversationList = useCallback(async () => {
    if (isLoggedIn) {
      const remote = await fetchRemoteSummaries();
      setConversations(remote);
    } else {
      setConversations(loadGuestConversations().map(toConversationSummary));
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (authLoading) return;

    const init = async () => {
      setRecentSearches(loadRecentSearches());

      if (isLoggedIn) {
        const remote = await fetchRemoteSummaries();
        setConversations(remote);
      } else {
        const guest = loadGuestConversations().map(toConversationSummary);
        setConversations(guest);
        const activeId = getGuestActiveConversationId();
        if (activeId) {
          const conv = loadGuestConversation(activeId);
          if (conv) {
            setActiveConversation(conv);
            if (conv.propertyContext) setPropertyContext(conv.propertyContext);
          }
        }
      }
      setHydrated(true);
    };

    init();
  }, [authLoading, isLoggedIn]);

  useEffect(() => {
    if (initialPropertyContext) {
      setPropertyContext(initialPropertyContext);
    }
  }, [initialPropertyContext]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages.length, loading]);

  const persistConversation = useCallback(
    async (conversation: AskConversation) => {
      if (isLoggedIn) {
        await persistRemoteConversation(conversation);
        await refreshConversationList();
      } else {
        upsertGuestConversation(conversation);
        setGuestActiveConversationId(conversation.id);
        setConversations(loadGuestConversations().map(toConversationSummary));
      }
      setActiveConversation(conversation);
    },
    [isLoggedIn, refreshConversationList],
  );

  const startNewChat = useCallback(
    async (ctx?: PropertyContext | null) => {
      const context = ctx ?? propertyContext;
      const empty = createEmptyConversation("New conversation", context);

      if (isLoggedIn) {
        const remote = await createRemoteConversation("New conversation", context);
        if (remote) {
          setActiveConversation(remote);
          await refreshConversationList();
          return remote;
        }
      }

      setActiveConversation(empty);
      setGuestActiveConversationId(empty.id);
      upsertGuestConversation(empty);
      setConversations(loadGuestConversations().map(toConversationSummary));
      return empty;
    },
    [isLoggedIn, propertyContext, refreshConversationList],
  );

  const loadConversation = useCallback(
    async (id: string) => {
      if (isLoggedIn) {
        const remote = await fetchRemoteConversation(id);
        if (remote) {
          setActiveConversation(remote);
          if (remote.propertyContext) setPropertyContext(remote.propertyContext);
          setSidebarOpen(false);
        }
        return;
      }

      const guest = loadGuestConversation(id);
      if (guest) {
        setActiveConversation(guest);
        setGuestActiveConversationId(guest.id);
        if (guest.propertyContext) setPropertyContext(guest.propertyContext);
        setSidebarOpen(false);
      }
    },
    [isLoggedIn],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      if (isLoggedIn) {
        await fetch(`/api/ask/conversations/${id}`, { method: "DELETE" });
      } else {
        deleteGuestConversation(id);
      }

      if (activeConversation?.id === id) {
        setActiveConversation(null);
        setGuestActiveConversationId(null);
      }
      await refreshConversationList();
    },
    [activeConversation?.id, isLoggedIn, refreshConversationList],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const messageText = text.trim();
      if (!messageText || loading) return;

      setLoading(true);
      setTypingPhase("understanding");
      setRecentSearches(addRecentSearch(messageText));

      let conversation = activeConversation;
      if (!conversation) {
        conversation = await startNewChat(propertyContext);
      }
      if (!conversation) {
        setLoading(false);
        return;
      }

      const userMessage = buildUserMessage(messageText);
      const withUser: AskConversation = {
        ...conversation,
        messages: [...conversation.messages, userMessage],
        updatedAt: new Date().toISOString(),
      };
      setActiveConversation(withUser);

      try {
        const history = conversationToHistory(conversation);
        const engineResponse = await queryAskEngine(
          messageText,
          history,
          propertyContext ?? conversation.propertyContext,
          conversation.suggestedPropertyIds,
        );

        setTypingPhase(engineResponse.searchedDatabase ? "searching" : "responding");

        const { message: assistantMessage } = buildAssistantMessage(
          messageText,
          engineResponse,
        );

        const title =
          conversation.messages.length === 0
            ? generateConversationTitle({
                userMessage: messageText,
                intent: engineResponse.intent,
                location: engineResponse.location,
                budget: engineResponse.budget,
                bedrooms: engineResponse.bedrooms,
              })
            : conversation.title;

        const updated: AskConversation = {
          ...withUser,
          title,
          messages: [...withUser.messages, assistantMessage],
          suggestedPropertyIds: mergeSuggestedPropertyIds(
            conversation,
            assistantMessage.suggestedPropertyIds ?? [],
          ),
          updatedAt: new Date().toISOString(),
          propertyContext: propertyContext ?? conversation.propertyContext,
        };

        await persistConversation(updated);
      } catch (error) {
        console.error("Ask engine error:", error);
        const errorMessage: AskChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Something went wrong while processing your request. Please try again.",
          timestamp: new Date().toISOString(),
        };
        await persistConversation({
          ...withUser,
          messages: [...withUser.messages, errorMessage],
          updatedAt: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
        setTypingPhase("understanding");
      }
    },
    [
      activeConversation,
      loading,
      persistConversation,
      propertyContext,
      startNewChat,
    ],
  );

  return {
    isLoggedIn,
    authLoading,
    hydrated,
    conversations,
    activeConversation,
    recentSearches,
    propertyContext,
    setPropertyContext,
    loading,
    typingStatus: getTypingStatus(typingPhase),
    sidebarOpen,
    setSidebarOpen,
    messagesEndRef,
    startNewChat,
    loadConversation,
    deleteConversation,
    sendMessage,
    refreshConversationList,
  };
}

export type { AskChatMessage, AskConversation, AskConversationSummary };
