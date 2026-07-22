"use client";

import {
  THINKING_CARD_ROTATE_MS,
  THINKING_RESEARCH_CARDS,
  THINKING_ROTATE_MS,
  THINKING_STATUS_MESSAGES,
} from "@/lib/ask/loading/content";
import { FadeSwap } from "./FadeSwap";
import { useShuffledRotation } from "./useShuffledRotation";

export function ThinkingStatus({ active }: { active: boolean }) {
  const message = useShuffledRotation(THINKING_STATUS_MESSAGES, THINKING_ROTATE_MS, active);
  const card = useShuffledRotation(THINKING_RESEARCH_CARDS, THINKING_CARD_ROTATE_MS, active);

  if (!message && !card) return null;

  return (
    <div className="space-y-2.5">
      {card ? (
        <FadeSwap swapKey={card.title}>
          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white px-4 py-3.5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                </span>
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-heading-primary">{card.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{card.detail}</p>
              </div>
            </div>
          </div>
        </FadeSwap>
      ) : null}

      {message ? (
        <div className="flex items-start gap-2.5 rounded-xl bg-[#F7FBF8] px-3 py-2.5 ring-1 ring-emerald-100/80">
          <span
            className="mt-1.5 h-2 w-2 shrink-0 animate-pulse rounded-full bg-brand shadow-[0_0_0_3px_rgba(74,170,39,0.18)]"
            aria-hidden
          />
          <FadeSwap swapKey={message} className="min-w-0">
            <p className="text-sm leading-relaxed text-heading-primary">{message}</p>
          </FadeSwap>
        </div>
      ) : null}
    </div>
  );
}
