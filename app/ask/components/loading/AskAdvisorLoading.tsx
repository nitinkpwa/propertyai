"use client";

import { useEffect, useState } from "react";
import { ALMOST_DONE_MS, LONG_WAIT_MS } from "@/lib/ask/loading/content";
import { AIThinkingTimeline } from "./AIThinkingTimeline";
import { DidYouKnowCard } from "./DidYouKnowCard";
import { LoadingProgress } from "./LoadingProgress";
import { RealEstateFacts } from "./RealEstateFacts";
import { RotatingPropertyTips } from "./RotatingPropertyTips";
import { ThinkingStatus } from "./ThinkingStatus";

/**
 * Premium Ask loading experience — consultant-style research UI.
 * Timers stop immediately when `active` becomes false.
 */
export function AskAdvisorLoading({ active = true }: { active?: boolean }) {
  const [elapsedBand, setElapsedBand] = useState<"early" | "long" | "almost">("early");

  useEffect(() => {
    if (!active) {
      setElapsedBand("early");
      return;
    }

    setElapsedBand("early");
    const t5 = window.setTimeout(() => setElapsedBand("long"), LONG_WAIT_MS);
    const t10 = window.setTimeout(() => setElapsedBand("almost"), ALMOST_DONE_MS);

    return () => {
      window.clearTimeout(t5);
      window.clearTimeout(t10);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      className="flex items-start gap-3"
      aria-live="polite"
      aria-busy="true"
      aria-label="AreaIQ is researching your request"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white shadow-[0_2px_8px_rgba(74,170,39,0.35)]">
        IQ
      </div>

      <div className="min-w-0 max-w-[min(92%,40rem)] flex-1 space-y-3">
        <div className="overflow-hidden rounded-[1.35rem] rounded-bl-md border border-neutral-200/80 bg-white px-4 py-4 shadow-[0_8px_28px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                AreaIQ Intelligence
              </p>
              <p className="mt-0.5 text-sm font-semibold text-heading-primary">
                We&apos;re still searching verified inventory…
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
              </span>
              Live
            </span>
          </div>

          <div className="mt-3">
            <LoadingProgress active={active} />
          </div>

          <div className="mt-4">
            <AIThinkingTimeline active={active} />
          </div>

          <div className="mt-4">
            <ThinkingStatus active={active} />
          </div>

          {elapsedBand !== "early" ? (
            <p className="mt-3 rounded-xl bg-[#F7F9F8] px-3 py-2.5 text-xs leading-relaxed text-body transition-opacity duration-500">
              {elapsedBand === "almost"
                ? "Almost done. Finalizing the best matches for you."
                : "Good recommendations take a little longer because AreaIQ compares live listings, builder profiles, locality data and market trends before recommending."}
            </p>
          ) : null}
        </div>

        <RotatingPropertyTips active={active} />
        <div className="grid gap-3 sm:grid-cols-2">
          <DidYouKnowCard active={active} />
          <RealEstateFacts active={active} />
        </div>
      </div>
    </div>
  );
}
