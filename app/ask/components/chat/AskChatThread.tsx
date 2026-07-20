"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type RefObject,
  type UIEvent,
} from "react";
import type { PropertyContext } from "@/lib/ask/client";
import type { AskChatMessage } from "@/lib/ask/conversations/types";
import { pairMessages, turnFromMessage } from "../../lib/turnFromMessage";
import { AskAssistantMessage } from "./AskAssistantMessage";
import { AskEmptyState } from "./AskEmptyState";
import { AskTypingIndicator } from "./AskTypingIndicator";

interface AskChatThreadProps {
  messages: AskChatMessage[];
  propertyContext: PropertyContext | null;
  loading: boolean;
  typingStatus: string;
  /** @deprecated kept for call-site compat; scroll is owned by this thread */
  messagesEndRef?: RefObject<HTMLDivElement | null>;
  onFollowUp: (text: string) => void;
  onOpenIntel?: () => void;
  onScrollElevated?: (elevated: boolean) => void;
}

export function AskChatThread({
  messages,
  propertyContext,
  loading,
  typingStatus,
  onFollowUp,
  onOpenIntel,
  onScrollElevated,
}: AskChatThreadProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const typingAnchorRef = useRef<HTMLDivElement>(null);
  const latestAssistantAnchorRef = useRef<HTMLDivElement>(null);

  /** When false, never fight the user's scroll position */
  const autoScrollEnabledRef = useRef(true);
  /** True only after the user sends a message / a new AI cycle begins */
  const expectAssistantScrollRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const lastScrolledAssistantIdRef = useRef<string | null>(null);
  const didScrollTypingRef = useRef(false);

  const scrollAnchorToStart = useCallback((el: HTMLElement | null) => {
    if (!autoScrollEnabledRef.current || !el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    onScrollElevated?.(el.scrollTop > 4);

    // Manual upward scroll → disable auto-scroll until the next message cycle
    if (el.scrollTop + 2 < lastScrollTopRef.current) {
      autoScrollEnabledRef.current = false;
    }
    lastScrollTopRef.current = el.scrollTop;
  };

  // New user turn / AI cycle starts → re-enable and scroll once to typing bubble top
  useEffect(() => {
    if (!loading) {
      didScrollTypingRef.current = false;
      return;
    }

    autoScrollEnabledRef.current = true;
    expectAssistantScrollRef.current = true;
    didScrollTypingRef.current = false;

    const id = window.requestAnimationFrame(() => {
      if (didScrollTypingRef.current) return;
      didScrollTypingRef.current = true;
      scrollAnchorToStart(typingAnchorRef.current);
    });

    return () => window.cancelAnimationFrame(id);
  }, [loading, scrollAnchorToStart]);

  // Brand-new assistant message → scroll once to its TOP (never to the bottom)
  useEffect(() => {
    let latestAssistant: AskChatMessage | null = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        latestAssistant = messages[i];
        break;
      }
    }

    if (!latestAssistant) return;
    if (lastScrolledAssistantIdRef.current === latestAssistant.id) return;

    // Conversation load / history switch — seed id, do not jump
    if (!expectAssistantScrollRef.current) {
      lastScrolledAssistantIdRef.current = latestAssistant.id;
      return;
    }

    lastScrolledAssistantIdRef.current = latestAssistant.id;
    expectAssistantScrollRef.current = false;

    if (!autoScrollEnabledRef.current) return;

    const id = window.requestAnimationFrame(() => {
      scrollAnchorToStart(latestAssistantAnchorRef.current);
    });

    return () => window.cancelAnimationFrame(id);
  }, [messages, scrollAnchorToStart]);

  if (messages.length === 0 && !loading) {
    return (
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        onScroll={handleScroll}
      >
        <AskEmptyState propertyContext={propertyContext} onSuggest={onFollowUp} />
      </div>
    );
  }

  const pairs = pairMessages(messages);
  const latestAssistantId = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i].id;
    }
    return null;
  })();

  return (
    <div
      ref={scrollContainerRef}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-touch px-3 py-4 sm:px-5 sm:py-5 lg:px-8"
      onScroll={handleScroll}
    >
      <div className="mx-auto w-full max-w-[1100px] space-y-6 pb-2">
        {propertyContext && messages.length > 0 ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-xs text-emerald-900">
            <span className="font-semibold">Context:</span> {propertyContext.name} ·{" "}
            {propertyContext.location}
          </div>
        ) : null}

        {pairs.map((pair, index) => {
          const isLatestAssistant =
            pair.assistant != null && pair.assistant.id === latestAssistantId;

          return (
            <div key={pair.user?.id ?? pair.assistant?.id ?? index} className="space-y-4">
              {pair.user ? (
                <div className="flex justify-end">
                  <div className="max-w-[min(88%,36rem)] rounded-[1.25rem] rounded-br-md bg-brand px-4 py-3 text-base leading-relaxed text-white shadow-sm">
                    {pair.user.content}
                  </div>
                </div>
              ) : null}

              {pair.assistant ? (
                <div
                  ref={isLatestAssistant ? latestAssistantAnchorRef : undefined}
                  className="scroll-mt-3"
                >
                  <AskAssistantMessage
                    turn={turnFromMessage(pair.assistant, pair.user?.content ?? "")}
                    onAction={onFollowUp}
                    onOpenIntel={onOpenIntel}
                  />
                </div>
              ) : null}
            </div>
          );
        })}

        {loading ? (
          <div ref={typingAnchorRef} className="scroll-mt-3">
            <AskTypingIndicator status={typingStatus} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
