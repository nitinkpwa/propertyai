"use client";

import { useEffect, useState } from "react";
import {
  TIMELINE_STEP_MS,
  TIMELINE_STEPS,
  type TimelineStepId,
} from "@/lib/ask/loading/content";

type StepState = "pending" | "active" | "done";

function stateForIndex(index: number, activeIndex: number): StepState {
  if (index < activeIndex) return "done";
  if (index === activeIndex) return "active";
  return "pending";
}

export function AIThinkingTimeline({ active }: { active: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex(0);
    const id = window.setInterval(() => {
      setActiveIndex((prev) => Math.min(prev + 1, TIMELINE_STEPS.length - 1));
    }, TIMELINE_STEP_MS);

    return () => window.clearInterval(id);
  }, [active]);

  return (
    <ol className="space-y-2.5" aria-label="Analysis steps">
      {TIMELINE_STEPS.map((step, index) => {
        const state = stateForIndex(index, activeIndex);
        return (
          <TimelineRow
            key={step.id}
            id={step.id}
            state={state}
            activeLabel={step.activeLabel}
            doneLabel={step.doneLabel}
          />
        );
      })}
    </ol>
  );
}

function TimelineRow({
  id,
  state,
  activeLabel,
  doneLabel,
}: {
  id: TimelineStepId;
  state: StepState;
  activeLabel: string;
  doneLabel: string;
}) {
  const label = state === "done" ? doneLabel : activeLabel;

  return (
    <li
      className={`flex items-start gap-2.5 transition-all duration-500 ease-out ${
        state === "pending" ? "opacity-35" : "opacity-100"
      }`}
      data-step={id}
      data-state={state}
    >
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
        {state === "done" ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700">
            ✓
          </span>
        ) : state === "active" ? (
          <span className="relative flex h-5 w-5 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-brand/25" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-brand" />
          </span>
        ) : (
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
        )}
      </span>
      <span
        className={`text-sm leading-snug transition-colors duration-300 ${
          state === "active"
            ? "font-medium text-heading-primary"
            : state === "done"
              ? "text-emerald-800"
              : "text-muted"
        }`}
      >
        {label}
      </span>
    </li>
  );
}
