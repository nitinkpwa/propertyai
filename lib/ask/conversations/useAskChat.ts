"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  queryAskEngineStream,
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
import { trackCrmEvent } from "@/lib/crm/queries";
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
  const [awaitingFirstToken, setAwaitingFirstToken] = useState(false);
  const [typingPhase, setTypingPhase] = useState<TypingPhase>("understanding");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  /** @deprecated scroll ownership moved to AskChatThread — kept for call-site compat */
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastUserPromptRef = useRef<string | null>(null);
  const activeConversationRef = useRef<AskConversation | null>(null);
  const sendMessageRef = useRef<(text: string) => Promise<void>>(async () => {});

  activeConversationRef.current = activeConversation;

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
            setPropertyContext(conv.propertyContext ?? null);
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
      activeConversationRef.current = conversation;
    },
    [isLoggedIn, refreshConversationList],
  );

  const startNewChat = useCallback(
    async (ctx?: PropertyContext | null) => {
      // Explicit arg wins; omit/undefined clears sticky property context (New chat).
      const context = ctx !== undefined ? ctx : null;
      setPropertyContext(context);
      const empty = createEmptyConversation("New conversation", context);

      if (isLoggedIn) {
        const remote = await createRemoteConversation("New conversation", context);
        if (remote) {
          activeConversationRef.current = remote;
          setActiveConversation(remote);
          await refreshConversationList();
          return remote;
        }
      }

      activeConversationRef.current = empty;
      setActiveConversation(empty);
      setGuestActiveConversationId(empty.id);
      upsertGuestConversation(empty);
      setConversations(loadGuestConversations().map(toConversationSummary));
      return empty;
    },
    [isLoggedIn, refreshConversationList],
  );

  const loadConversation = useCallback(
    async (id: string) => {
      if (isLoggedIn) {
        const remote = await fetchRemoteConversation(id);
        if (remote) {
          activeConversationRef.current = remote;
          setActiveConversation(remote);
          setPropertyContext(remote.propertyContext ?? null);
          setSidebarOpen(false);
        }
        return;
      }

      const guest = loadGuestConversation(id);
      if (guest) {
        activeConversationRef.current = guest;
        setActiveConversation(guest);
        setGuestActiveConversationId(guest.id);
        setPropertyContext(guest.propertyContext ?? null);
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

  const cancelGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setAwaitingFirstToken(false);
    setTypingPhase("understanding");
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const messageText = text.trim();
      if (!messageText || loading) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setAwaitingFirstToken(true);
      setTypingPhase("understanding");
      setRecentSearches(addRecentSearch(messageText));
      lastUserPromptRef.current = messageText;

      let conversation = activeConversationRef.current;
      if (!conversation) {
        conversation = await startNewChat(propertyContext);
      }
      if (!conversation) {
        setLoading(false);
        return;
      }

      const userMessage = buildUserMessage(messageText);
      const assistantId = crypto.randomUUID();
      const streamingAssistant: AskChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
        streaming: true,
      };

      const withUser: AskConversation = {
        ...conversation,
        messages: [...conversation.messages, userMessage],
        updatedAt: new Date().toISOString(),
      };
      activeConversationRef.current = withUser;
      setActiveConversation(withUser);

      // Append streaming stub so tokens render in place (no page rebuild).
      const withStub: AskConversation = {
        ...withUser,
        messages: [...withUser.messages, streamingAssistant],
        updatedAt: new Date().toISOString(),
      };
      activeConversationRef.current = withStub;
      setActiveConversation(withStub);

      let assembled = "";
      let firstToken = false;

      const patchAssistant = (patch: Partial<AskChatMessage>) => {
        setActiveConversation((prev) => {
          if (!prev) return prev;
          const messages = prev.messages.map((m) =>
            m.id === assistantId ? { ...m, ...patch } : m,
          );
          const next = { ...prev, messages, updatedAt: new Date().toISOString() };
          activeConversationRef.current = next;
          return next;
        });
      };

      try {
        const history = conversationToHistory(conversation);
        const engineResponse = await queryAskEngineStream(
          messageText,
          history,
          propertyContext ?? conversation.propertyContext,
          conversation.suggestedPropertyIds,
          controller.signal,
          {
            onStatus: (phase) => {
              if (phase === "understanding" || phase === "searching" || phase === "responding") {
                setTypingPhase(phase);
              }
            },
            onToken: (delta) => {
              if (!firstToken) {
                firstToken = true;
                setTypingPhase("responding");
                setAwaitingFirstToken(false);
              }
              assembled += delta;
              patchAssistant({ content: assembled, streaming: true });
            },
          },
        );

        if (controller.signal.aborted) {
          patchAssistant({
            content: assembled || "Generation stopped.",
            streaming: false,
          });
          return;
        }

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

        const finalAssistant: AskChatMessage = {
          ...assistantMessage,
          id: assistantId,
          content: engineResponse.answer || assembled,
          streaming: false,
        };

        const updated: AskConversation = {
          ...withUser,
          title,
          messages: [...withUser.messages, finalAssistant],
          suggestedPropertyIds: mergeSuggestedPropertyIds(
            conversation,
            finalAssistant.suggestedPropertyIds ?? [],
          ),
          updatedAt: new Date().toISOString(),
          propertyContext: propertyContext ?? conversation.propertyContext,
        };

        await persistConversation(updated);

        if (isLoggedIn) {
          void trackCrmEvent({
            activityType: "ai_chat_message",
            title: "Asked AI",
            description: messageText.slice(0, 160),
            conversationId: updated.id,
            propertyId: propertyContext?.id ?? conversation.propertyContext?.id,
          });
        }
      } catch (error) {
        if (
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
          patchAssistant({
            content: assembled || "Generation stopped.",
            streaming: false,
          });
          return;
        }
        console.error("Ask engine error:", error);
        const friendly =
          error instanceof Error && error.message
            ? error.message
            : "Something went wrong while processing your request. Please try again.";
        const errorMessage: AskChatMessage = {
          id: assistantId,
          role: "assistant",
          content: friendly,
          timestamp: new Date().toISOString(),
          streaming: false,
          followUps: ["Try again", "3 BHK in Mohali"],
        };
        await persistConversation({
          ...withUser,
          messages: [...withUser.messages, errorMessage],
          updatedAt: new Date().toISOString(),
        });
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setLoading(false);
          setAwaitingFirstToken(false);
          setTypingPhase("understanding");
        }
      }
    },
    [
      isLoggedIn,
      loading,
      persistConversation,
      propertyContext,
      startNewChat,
    ],
  );

  sendMessageRef.current = sendMessage;

  const continueGeneration = useCallback(async () => {
    if (loading) return;
    await sendMessageRef.current(
      "Please continue your previous answer from where you left off.",
    );
  }, [loading]);

  const retryLastMessage = useCallback(async () => {
    const prompt = lastUserPromptRef.current;
    if (!prompt || loading) return;

    const current = activeConversationRef.current;
    if (current?.messages.length) {
      const msgs = [...current.messages];
      if (msgs[msgs.length - 1]?.role === "assistant") {
        msgs.pop();
      }
      if (msgs[msgs.length - 1]?.role === "user") {
        msgs.pop();
      }
      const trimmed: AskConversation = {
        ...current,
        messages: msgs,
        updatedAt: new Date().toISOString(),
      };
      activeConversationRef.current = trimmed;
      setActiveConversation(trimmed);
    }

    await sendMessageRef.current(prompt);
  }, [loading]);

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
    awaitingFirstToken,
    typingStatus: getTypingStatus(typingPhase),
    sidebarOpen,
    setSidebarOpen,
    messagesEndRef,
    startNewChat,
    loadConversation,
    deleteConversation,
    sendMessage,
    cancelGeneration,
    retryLastMessage,
    continueGeneration,
    refreshConversationList,
  };
}

export type { AskChatMessage, AskConversation, AskConversationSummary };
