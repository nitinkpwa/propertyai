"use client";

import type { RefObject, UIEvent } from "react";
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
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onFollowUp: (text: string) => void;
  onOpenIntel?: () => void;
  onScrollElevated?: (elevated: boolean) => void;
}

export function AskChatThread({
  messages,
  propertyContext,
  loading,
  typingStatus,
  messagesEndRef,
  onFollowUp,
  onOpenIntel,
  onScrollElevated,
}: AskChatThreadProps) {
  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    onScrollElevated?.(e.currentTarget.scrollTop > 4);
  };

  if (messages.length === 0 && !loading) {
    return (
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        onScroll={handleScroll}
      >
        <AskEmptyState propertyContext={propertyContext} onSuggest={onFollowUp} />
      </div>
    );
  }

  const pairs = pairMessages(messages);

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5 sm:py-5 lg:px-8"
      onScroll={handleScroll}
    >
      <div className="mx-auto w-full max-w-[1100px] space-y-6 pb-2">
        {propertyContext && messages.length > 0 ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-xs text-emerald-900">
            <span className="font-semibold">Context:</span> {propertyContext.name} ·{" "}
            {propertyContext.location}
          </div>
        ) : null}

        {pairs.map((pair, index) => (
          <div key={pair.user?.id ?? pair.assistant?.id ?? index} className="space-y-4">
            {pair.user ? (
              <div className="flex justify-end animate-in fade-in slide-in-from-bottom-1 duration-300">
                <div className="max-w-[min(85%,42rem)] rounded-2xl rounded-tr-md bg-neutral-900 px-4 py-3 text-sm leading-relaxed text-white shadow-sm">
                  {pair.user.content}
                </div>
              </div>
            ) : null}

            {pair.assistant ? (
              <AskAssistantMessage
                turn={turnFromMessage(pair.assistant, pair.user?.content ?? "")}
                onAction={onFollowUp}
                onOpenIntel={onOpenIntel}
              />
            ) : null}
          </div>
        ))}

        {loading ? <AskTypingIndicator status={typingStatus} /> : null}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
