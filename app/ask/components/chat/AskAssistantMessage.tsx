"use client";

import { useMemo, useState, type ReactNode, type SyntheticEvent } from "react";
import type { AskSection, AskTurn } from "@/lib/ask/types";
import { AskPropertyCarousel } from "../intel/AskPropertyCarousel";
import { AskMarkdown } from "../shared/AskMarkdown";

const DEFAULT_SMART_ACTIONS = [
  "Compare with nearby projects",
  "Calculate EMI",
  "Show similar properties",
  "Explain risk",
  "Predict future price",
  "Generate investment report",
];

interface AskAssistantMessageProps {
  turn: AskTurn;
  onAction: (text: string) => void;
  onOpenIntel?: () => void;
}

export function AskAssistantMessage({
  turn,
  onAction,
  onOpenIntel,
}: AskAssistantMessageProps) {
  const [expanded, setExpanded] = useState(false);
  const sections = turn.sections;
  const hasSections = sections.length > 0;
  const hasListings = turn.listings.length > 0;

  const summaryText = useMemo(() => {
    if (hasSections) {
      return sections[0]?.content?.slice(0, 280) ?? turn.headline;
    }
    const plain = (turn.aiContent ?? "")
      .replace(/^##\s+.+\n?/gm, "")
      .replace(/\*\*/g, "")
      .trim();
    return plain.slice(0, 320) || turn.headline;
  }, [hasSections, sections, turn.aiContent, turn.headline]);

  const orderedSections = useMemo(() => orderInsightSections(sections), [sections]);
  const visibleSections = expanded ? orderedSections : orderedSections.slice(0, 4);

  const actions =
    turn.quickActions.length > 0
      ? turn.quickActions
      : DEFAULT_SMART_ACTIONS.slice(0, 5);
  const chips =
    turn.followUps.length > 0
      ? turn.followUps
      : ["Highest ROI", "Under ₹1 Cr", "Builder Review", "Metro Connectivity", "Rental Income"];

  const matchCount = turn.listings.length;
  const matchSubtitle =
    matchCount === 1 ? "1 Matching Property" : `${matchCount} Properties Found`;

  return (
    <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-[10px] font-bold text-white shadow-sm">
        IQ
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="rounded-2xl rounded-tl-md border border-neutral-200/80 bg-white px-4 py-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              {turn.intent}
            </span>
            {turn.isSimilar ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                Closest matches
              </span>
            ) : null}
            {hasListings ? (
              <button
                type="button"
                onClick={onOpenIntel}
                className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-body hover:bg-emerald-50 hover:text-emerald-800 lg:hidden"
              >
                {turn.listings.length} properties →
              </button>
            ) : null}
          </div>

          <h3 className="mt-2 text-base font-bold tracking-tight text-heading-primary sm:text-lg">
            {turn.headline}
          </h3>
          {turn.subtext ? <p className="mt-1 text-xs text-muted">{turn.subtext}</p> : null}

          {turn.stats ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { label: "Avg Price", value: formatShort(turn.stats.avgPrice) },
                { label: "Avg Yield", value: `${turn.stats.avgRentalYield.toFixed(1)}%` },
                {
                  label: "Best Score",
                  value: `${Math.round(turn.stats.bestInvestmentScore)}`,
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-neutral-100 bg-neutral-50/80 px-2.5 py-2"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-label">
                    {s.label}
                  </p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-heading-primary">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {/* Quick Summary */}
          <div className="mt-3 rounded-xl border border-emerald-100/80 bg-emerald-50/40 px-3.5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
              Quick summary
            </p>
            <p className="mt-1 text-sm leading-relaxed text-body">
              {summaryText}
              {summaryText.length >= 280 ? "…" : ""}
            </p>
          </div>

          {/* Best Match Properties — section header (not clickable) */}
          {hasListings ? (
            <section
              className="mt-5 w-full animate-in fade-in zoom-in-[0.98] duration-[250ms]"
              aria-label="Best match properties"
            >
              <div
                className="relative w-full overflow-hidden rounded-[18px] border px-4 py-4"
                style={{
                  backgroundColor: "#F8FFFC",
                  borderColor: "rgba(16,185,129,0.18)",
                }}
              >
                <span
                  className="absolute inset-x-0 top-0 h-[3px] bg-emerald-500"
                  aria-hidden
                />
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    <HouseIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-lg font-bold leading-snug tracking-tight text-[#111827]">
                          Best Match Properties
                        </h4>
                        <p className="mt-0.5 text-[13px] font-medium text-neutral-500">
                          {matchSubtitle}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                        {turn.isSimilar ? "Updated" : "Live"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 w-full min-w-0 overflow-hidden">
                <AskPropertyCarousel
                  listings={turn.listings}
                  rationales={turn.propertyRationales}
                  onAskAbout={onAction}
                  hideHeader
                />
              </div>
            </section>
          ) : null}

          {/* Top Recommendations → What to Watch → other insights */}
          {hasSections ? (
            <div className={`grid gap-4 sm:grid-cols-2 ${hasListings ? "mt-5" : "mt-4"}`}>
              {visibleSections.map((section) => (
                <InsightDetails
                  key={section.title}
                  title={section.title}
                  initiallyOpen={section.title.toLowerCase().includes("top recommendation")}
                >
                  <AskMarkdown content={section.content} />
                </InsightDetails>
              ))}
            </div>
          ) : turn.aiContent ? (
            <div
              className={`max-h-48 overflow-y-auto rounded-xl border border-neutral-100 bg-neutral-50/40 px-3 py-3 ${
                hasListings ? "mt-5" : "mt-4"
              }`}
            >
              <AskMarkdown content={turn.aiContent} />
            </div>
          ) : null}

          {hasSections && sections.length > 4 ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 text-xs font-semibold text-emerald-700 hover:underline"
            >
              {expanded ? "Show fewer insights" : `Show all ${sections.length} insights`}
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5 pl-1">
          {actions.slice(0, 6).map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => onAction(action)}
              className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-body shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
            >
              {action}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 pl-1">
          {chips.slice(0, 8).map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onAction(chip)}
              className="rounded-full bg-neutral-100/90 px-2.5 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-emerald-100 hover:text-emerald-800"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function InsightDetails({
  title,
  initiallyOpen,
  children,
}: {
  title: string;
  initiallyOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);

  const handleToggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
    setOpen(event.currentTarget.open);
  };

  return (
    <details
      className="group rounded-xl border border-neutral-100 bg-neutral-50/50 open:bg-white open:shadow-sm"
      open={open}
      onToggle={handleToggle}
    >
      <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-semibold text-heading-primary marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          {title}
          <span className="text-muted transition group-open:rotate-180">▾</span>
        </span>
      </summary>
      <div className="border-t border-neutral-100 px-3 py-2.5">{children}</div>
    </details>
  );
}

function orderInsightSections(sections: AskSection[]): AskSection[] {
  return [...sections].sort((a, b) => sectionPriority(a.title) - sectionPriority(b.title));
}

function sectionPriority(title: string): number {
  const t = title.toLowerCase();
  if (t.includes("top recommendation")) return 0;
  if (t.includes("what to watch")) return 1;
  if (t.includes("summary") || t.includes("verdict")) return 2;
  return 3;
}

function HouseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}

function formatShort(price: number): string {
  if (price >= 10_000_000) return `₹${(price / 10_000_000).toFixed(2)} Cr`;
  if (price >= 100_000) return `₹${Math.round(price / 100_000)} L`;
  return `₹${Math.round(price).toLocaleString("en-IN")}`;
}
