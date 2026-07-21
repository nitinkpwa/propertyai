"use client";

import { THINKING_ROTATE_MS, THINKING_STATUS_MESSAGES } from "@/lib/ask/loading/content";
import { FadeSwap } from "./FadeSwap";
import { useShuffledRotation } from "./useShuffledRotation";

export function ThinkingStatus({ active }: { active: boolean }) {
  const message = useShuffledRotation(THINKING_STATUS_MESSAGES, THINKING_ROTATE_MS, active);

  if (!message) return null;

  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-[#F7FBF8] px-3 py-2.5 ring-1 ring-emerald-100/80">
      <span
        className="mt-1.5 h-2 w-2 shrink-0 animate-pulse rounded-full bg-brand shadow-[0_0_0_3px_rgba(74,170,39,0.18)]"
        aria-hidden
      />
      <FadeSwap swapKey={message} className="min-w-0">
        <p className="text-sm leading-relaxed text-heading-primary">{message}</p>
      </FadeSwap>
    </div>
  );
}
