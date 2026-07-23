"use client";

import { useEffect, useRef } from "react";

interface StepProgressProps {
  steps: Array<{ label: string; done: boolean; active?: boolean }>;
}

/**
 * Banking-app style journey timeline — snap-scroll, equal spacing,
 * sticky active stage, no clipped circles.
 */
export default function StepProgress({ steps }: StepProgressProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const active = activeRef.current;
    if (!scroller || !active) return;

    const frame = requestAnimationFrame(() => {
      const scrollerRect = scroller.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      const offset =
        activeRect.left -
        scrollerRect.left -
        scrollerRect.width / 2 +
        activeRect.width / 2 +
        scroller.scrollLeft;
      scroller.scrollTo({ left: Math.max(0, offset), behavior: "smooth" });
    });

    return () => cancelAnimationFrame(frame);
  }, [steps]);

  const activeIdx = steps.findIndex((s) => s.active);
  const progressPct =
    steps.length <= 1
      ? 0
      : (Math.max(activeIdx, 0) / (steps.length - 1)) * 100;

  return (
    <div className="relative -mx-1">
      {/* Sticky current stage label */}
      {activeIdx >= 0 ? (
        <div className="mb-4 flex items-center justify-between gap-3 px-1 sm:mb-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Current stage
            </p>
            <p className="truncate text-sm font-semibold text-heading-primary">
              {steps[activeIdx]?.label}
            </p>
          </div>
          <p className="shrink-0 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-emerald-700">
            {activeIdx + 1} / {steps.length}
          </p>
        </div>
      ) : null}

      <div
        ref={scrollerRef}
        className="scrollbar-thin overflow-x-auto overscroll-x-contain scroll-smooth px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
        role="list"
        aria-label="Buyer journey stages"
      >
        <div className="relative flex w-max min-w-full items-start justify-between gap-0 px-2 pt-1">
          {/* Track */}
          <div
            className="pointer-events-none absolute left-6 right-6 top-[18px] h-0.5 rounded-full bg-neutral-200"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute left-6 top-[18px] h-0.5 rounded-full bg-emerald-500 transition-[width] duration-500 ease-out"
            style={{
              width: `calc((100% - 3rem) * ${progressPct / 100})`,
            }}
            aria-hidden
          />

          {steps.map((step, i) => {
            const isActive = Boolean(step.active);
            const isDone = step.done && !isActive;

            return (
              <div
                key={step.label}
                ref={isActive ? activeRef : undefined}
                role="listitem"
                aria-current={isActive ? "step" : undefined}
                className="relative z-[1] flex w-[4.75rem] shrink-0 snap-center flex-col items-center gap-2 sm:w-[5.25rem]"
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold shadow-sm transition-all duration-300 ${
                    isDone
                      ? "bg-emerald-600 text-white shadow-emerald-200/80"
                      : isActive
                        ? "scale-110 bg-white text-emerald-700 ring-[3px] ring-emerald-500 shadow-md shadow-emerald-100"
                        : "bg-neutral-100 text-neutral-400 ring-1 ring-neutral-200"
                  }`}
                >
                  {isDone ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M5 13l4 4L19 7"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <span className="tabular-nums">{i + 1}</span>
                  )}
                </div>
                <span
                  className={`max-w-[4.5rem] text-center text-[10px] font-medium leading-tight sm:max-w-[5rem] sm:text-[11px] ${
                    isActive
                      ? "font-semibold text-emerald-800"
                      : isDone
                        ? "text-heading-secondary"
                        : "text-muted"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
