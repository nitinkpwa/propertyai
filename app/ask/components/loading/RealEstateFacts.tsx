"use client";

import { FACT_ROTATE_MS, REAL_ESTATE_FACTS } from "@/lib/ask/loading/content";
import { FadeSwap } from "./FadeSwap";
import { useShuffledRotation } from "./useShuffledRotation";

export function RealEstateFacts({ active }: { active: boolean }) {
  const fact = useShuffledRotation(REAL_ESTATE_FACTS, FACT_ROTATE_MS, active);

  if (!fact) return null;

  return (
    <div className="rounded-2xl border border-neutral-200/70 bg-[#FAFBFA] px-4 py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
        Market fact
      </p>
      <FadeSwap swapKey={fact.title} className="mt-1.5">
        <div>
          <p className="text-sm font-semibold text-heading-primary">{fact.title}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-body">{fact.body}</p>
        </div>
      </FadeSwap>
    </div>
  );
}
