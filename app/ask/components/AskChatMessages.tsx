"use client";

import type { RefObject } from "react";
import type { AskChatMessage } from "@/lib/ask/conversations/types";
import type { PropertyContext } from "@/lib/ask/client";
import Logo from "@/components/common/Logo";
import {
  AskRecommendedProperties,
  AskResponseCard,
  AskUserQueryCard,
} from "./AskConversation";
import type { AskTurn } from "@/lib/ask/types";

function formatInline(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^###\s+(.+)$/gm, '<h4 class="mt-3 mb-1 text-sm font-semibold text-heading-primary">$1</h4>')
    .replace(/^##\s+(.+)$/gm, '<h3 class="mt-4 mb-2 text-base font-semibold text-heading-primary">$1</h3>')
    .replace(/^-\s+(.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n/g, "<br />");
}

function messageToTurn(message: AskChatMessage, userQuery: string): AskTurn {
  return {
    id: message.id,
    userQuery,
    intent: message.uiIntent ?? "knowledge",
    headline: message.content.split("\n").find((l) => l.startsWith("##"))?.replace(/^##\s+/, "") ?? "AreaIQ",
    subtext: message.isSimilar ? "Showing closest matches from AreaIQ database." : null,
    aiContent: message.content,
    sections: [],
    stats: message.stats ?? null,
    listings: message.properties ?? [],
    propertyRationales: message.propertyRationales ?? {},
    isSimilar: message.isSimilar ?? false,
    quickActions: message.quickActions ?? [],
    followUps: message.followUps ?? [],
  };
}

interface AskChatMessagesProps {
  messages: AskChatMessage[];
  propertyContext: PropertyContext | null;
  loading: boolean;
  typingStatus: string;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onFollowUp: (text: string) => void;
}

export function AskChatMessages({
  messages,
  propertyContext,
  loading,
  typingStatus,
  messagesEndRef,
  onFollowUp,
}: AskChatMessagesProps) {
  if (messages.length === 0 && !loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
        <Logo size="hero" showTagline href={null} />
        <h1 className="mt-6 text-2xl font-bold text-heading-primary sm:text-3xl">
          AreaIQ Intelligence
        </h1>
        <p className="mt-3 max-w-lg text-muted">
          Your personal real estate advisor for Chandigarh Tricity. I remember our
          conversation — ask about properties, areas, investments, or compare projects.
        </p>
        {propertyContext ? (
          <div className="mt-6 max-w-md rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900">
            <span className="font-semibold">Viewing:</span> {propertyContext.name} — ask
            &ldquo;Is this property good for investment?&rdquo;
          </div>
        ) : null}
        <div className="mt-8 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            "3 BHK under ₹80 lakh in Mohali",
            "Tell me about Aerocity",
            "Where should I invest 80 lakh?",
            "Compare Aerocity vs New Chandigarh",
          ].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onFollowUp(suggestion)}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left text-sm text-body transition-colors hover:border-emerald-200 hover:bg-emerald-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const pairs: Array<{ user?: AskChatMessage; assistant?: AskChatMessage }> = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "user") {
      pairs.push({ user: msg });
    } else if (pairs.length > 0 && !pairs[pairs.length - 1].assistant) {
      pairs[pairs.length - 1].assistant = msg;
    } else {
      pairs.push({ assistant: msg });
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-8">
        {pairs.map((pair, index) => (
          <div key={pair.user?.id ?? pair.assistant?.id ?? index} className="space-y-4">
            {pair.user ? <AskUserQueryCard query={pair.user.content} /> : null}
            {pair.assistant ? (
              <>
                <AskResponseCard
                  turn={messageToTurn(
                    pair.assistant,
                    pair.user?.content ?? "",
                  )}
                />
                {pair.assistant.properties && pair.assistant.properties.length > 0 ? (
                  <AskRecommendedProperties
                    listings={pair.assistant.properties}
                    rationales={pair.assistant.propertyRationales}
                  />
                ) : null}
                {pair.assistant.followUps && pair.assistant.followUps.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {pair.assistant.followUps.map((followUp) => (
                      <button
                        key={followUp}
                        type="button"
                        onClick={() => onFollowUp(followUp)}
                        className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-body transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                      >
                        {followUp}
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        ))}

        {loading ? (
          <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center gap-3 text-sm text-body">
              <span className="inline-flex gap-1" aria-hidden>
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500"
                    style={{ animationDelay: `${dot * 0.15}s` }}
                  />
                ))}
              </span>
              <span>{typingStatus}</span>
            </div>
          </div>
        ) : null}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export { formatInline };
