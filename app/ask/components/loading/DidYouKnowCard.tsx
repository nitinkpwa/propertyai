"use client";

import { DID_YOU_KNOW, DID_YOU_KNOW_ROTATE_MS } from "@/lib/ask/loading/content";
import { FadeSwap } from "./FadeSwap";
import { useShuffledRotation } from "./useShuffledRotation";

export function DidYouKnowCard({ active }: { active: boolean }) {
  const fact = useShuffledRotation(DID_YOU_KNOW, DID_YOU_KNOW_ROTATE_MS, active);

  if (!fact) return null;

  return (
    <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/90 via-white to-white px-4 py-3.5 shadow-[0_2px_14px_rgba(74,170,39,0.06)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
        Did you know?
      </p>
      <FadeSwap swapKey={fact} className="mt-1.5">
        <p className="text-sm leading-relaxed text-heading-primary">{fact}</p>
      </FadeSwap>
    </div>
  );
}
