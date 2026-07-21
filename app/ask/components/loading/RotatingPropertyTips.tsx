"use client";

import {
  PROPERTY_INTELLIGENCE_TIPS,
  TIP_ROTATE_MS,
} from "@/lib/ask/loading/content";
import { FadeSwap } from "./FadeSwap";
import { useShuffledRotation } from "./useShuffledRotation";

export function RotatingPropertyTips({ active }: { active: boolean }) {
  const tip = useShuffledRotation(PROPERTY_INTELLIGENCE_TIPS, TIP_ROTATE_MS, active);

  if (!tip) return null;

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white px-4 py-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
        Property Intelligence Tip
      </p>
      <FadeSwap swapKey={tip} className="mt-1.5">
        <p className="text-sm leading-relaxed text-body">
          <span className="mr-1.5" aria-hidden>
            💡
          </span>
          {tip}
        </p>
      </FadeSwap>
    </div>
  );
}
