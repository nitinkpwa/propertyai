"use client";

import { useMemo, useState, type ReactNode, type SyntheticEvent } from "react";
import type { AskSection, AskTurn } from "@/lib/ask/types";
import { AskPropertyCarousel } from "../intel/AskPropertyCarousel";
import { AskMarkdown } from "../shared/AskMarkdown";
import { formatInrAmount } from "@/lib/properties/pricingDisplay";

const DEFAULT_SMART_ACTIONS = [
  "Compare with nearby projects",
  "Calculate EMI",
  "Show similar properties",
  "Explain risk",
  "Predict future price",
  "Generate investment report",
];

/** Sections that duplicate property/area/builder cards or the primary reply */
const DUPLICATE_SECTION_RE =
  /^(summary|search summary|quick summary|matching properties|nearby alternatives|area analysis|builder analysis|investment analysis|investment brief|ranked recommendations|confidence score|source|overview)$/i;

interface AskAssistantMessageProps {
  turn: AskTurn;
  onAction: (text: string) => void;
  onOpenIntel?: () => void;
  onRetry?: () => void;
  onContinue?: () => void;
  isLatest?: boolean;
  streaming?: boolean;
}

export function AskAssistantMessage({
  turn,
  onAction,
  onOpenIntel,
  onRetry,
  onContinue,
  isLatest = false,
  streaming = false,
}: AskAssistantMessageProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const sections = turn.sections;
  const hasListings = turn.listings.length > 0;

  const primaryContent = useMemo(
    () => buildPrimaryAdvisorContent(turn.aiContent, sections),
    [turn.aiContent, sections],
  );

  /** Extra insight cards only when legacy multi-section reports remain — never the primary reply */
  const insightSections = useMemo(() => {
    const extras = sections.filter((s) => !DUPLICATE_SECTION_RE.test(s.title.trim()));
    // If primary already contains the full answer, avoid re-showing the same blocks
    if (!primaryContent || extras.length === 0) return [];
    const primaryNorm = primaryContent.replace(/\s+/g, " ").slice(0, 200);
    return orderInsightSections(
      extras.filter((s) => {
        const body = s.content.replace(/\s+/g, " ");
        return body.length > 40 && !primaryNorm.includes(body.slice(0, 80));
      }),
    );
  }, [sections, primaryContent]);

  const visibleInsights = expanded ? insightSections : insightSections.slice(0, 4);

  const actions =
    turn.quickActions.length > 0
      ? turn.quickActions
      : DEFAULT_SMART_ACTIONS.slice(0, 4);
  const chips =
    turn.followUps.length > 0
      ? turn.followUps
      : ["Highest ROI", "Under ₹1 Cr", "Builder Review", "Metro Connectivity"];

  const matchCount = turn.listings.length;
  const matchSubtitle =
    matchCount === 1 ? "1 Matching Property" : `${matchCount} Properties Found`;

  const hasValidAnswer = Boolean(
    (primaryContent && primaryContent.trim().length > 40) ||
      turn.listings.length > 0,
  );
  // Hide Copy on hard failure (no useful body). Data-backed degraded answers stay copyable.
  const showCopy = hasValidAnswer && Boolean(primaryContent);
  // Continue only when a substantial answer exists
  const showContinue = Boolean(isLatest && onContinue && hasValidAnswer);

  const handleCopy = async () => {
    const text = primaryContent || turn.aiContent || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white shadow-sm">
        IQ
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="rounded-[1.35rem] rounded-bl-md border border-neutral-200/80 bg-white px-4 py-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700">
              {turn.intent}
            </span>
            {turn.intelligenceLevel === "partial" ? (
              <span
                className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800"
                title="Verified facts only — gaps listed, with next steps to continue"
              >
                🟡 Partial Intelligence
              </span>
            ) : null}
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

          <h3 className="mt-2 text-lg font-bold tracking-tight text-heading-primary sm:text-xl">
            {turn.headline}
          </h3>
          {turn.subtext ? <p className="mt-1 text-sm text-muted">{turn.subtext}</p> : null}

          {turn.intelligenceDigest && !streaming ? (
            <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                Verified inventory scan
              </p>
              <ul className="mt-1.5 space-y-0.5 text-xs text-emerald-900/90">
                <li>
                  ✓ {turn.intelligenceDigest.listingsSearched} verified listings
                  searched
                </li>
                <li>
                  ✓ {turn.intelligenceDigest.buildersChecked} builders checked
                </li>
                <li>
                  ✓ {turn.intelligenceDigest.marketSignalsAnalyzed} market
                  signals analyzed
                </li>
              </ul>
            </div>
          ) : null}

          {turn.intelligenceLevel === "partial" &&
          turn.missingSignals &&
          turn.missingSignals.length > 0 &&
          !streaming &&
          !turn.aiDegraded ? (
            <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                Still collecting
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {turn.missingSignals.slice(0, 5).map((signal) => (
                  <li key={signal} className="text-xs text-amber-900/90">
                    • {signal}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

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

          {/* Single primary conversational response — complements cards, never duplicates them */}
          {primaryContent ? (
            <div className="mt-3 text-base leading-relaxed text-body">
              <AskMarkdown content={primaryContent} streaming={streaming} />
            </div>
          ) : streaming ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Loading AI reasoning…
            </div>
          ) : null}

          {turn.aiDegraded && turn.aiNotice && !streaming ? (
            <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2 text-sm font-medium text-amber-900">
              {turn.aiNotice}
            </p>
          ) : null}

          {hasListings && !streaming ? (
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

              <div className="mt-4 w-full min-w-0">
                <AskPropertyCarousel
                  listings={turn.listings}
                  rationales={turn.propertyRationales}
                  onAskAbout={onAction}
                  hideHeader
                />
              </div>
            </section>
          ) : null}

          {visibleInsights.length > 0 ? (
            <div className={`grid gap-4 sm:grid-cols-2 ${hasListings ? "mt-5" : "mt-4"}`}>
              {visibleInsights.map((section) => (
                <InsightDetails
                  key={section.title}
                  title={section.title}
                  initiallyOpen={section.title.toLowerCase().includes("recommendation")}
                >
                  <AskMarkdown content={section.content} />
                </InsightDetails>
              ))}
            </div>
          ) : null}

          {insightSections.length > 4 ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 min-h-11 text-sm font-semibold text-emerald-700 hover:underline"
            >
              {expanded ? "Show fewer insights" : `Show all ${insightSections.length} insights`}
            </button>
          ) : null}

          {streaming ? null : (
          <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-neutral-100 pt-3">
            {showCopy ? (
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-muted transition hover:bg-neutral-50 hover:text-heading-primary"
                aria-label="Copy answer"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            ) : null}
            {isLatest && onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
                aria-label="Refresh Intelligence"
              >
                Refresh Intelligence
              </button>
            ) : null}
            {showContinue ? (
              <button
                type="button"
                onClick={onContinue}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-muted transition hover:bg-neutral-50 hover:text-heading-primary"
                aria-label="Continue generating"
              >
                Continue
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setFeedback("up")}
              className={`inline-flex min-h-11 w-11 items-center justify-center rounded-xl text-sm transition hover:bg-neutral-50 ${
                feedback === "up" ? "bg-emerald-50 text-emerald-700" : "text-muted"
              }`}
              aria-label="Helpful"
              aria-pressed={feedback === "up"}
            >
              👍
            </button>
            <button
              type="button"
              onClick={() => setFeedback("down")}
              className={`inline-flex min-h-11 w-11 items-center justify-center rounded-xl text-sm transition hover:bg-neutral-50 ${
                feedback === "down" ? "bg-rose-50 text-rose-600" : "text-muted"
              }`}
              aria-label="Not helpful"
              aria-pressed={feedback === "down"}
            >
              👎
            </button>
          </div>
          )}
        </div>

        {streaming ? null : (
        <div className="space-y-2 pl-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-label">
            {turn.intelligenceLevel === "partial"
              ? "Suggested next questions"
              : "Continue"}
          </p>
          <div className="flex flex-wrap gap-2">
            {(actions.length > 0 ? actions : chips).slice(0, 5).map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => onAction(action)}
                className="min-h-11 rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-body shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

/**
 * One primary advisor reply. Prefer the full conversational answer;
 * for legacy multi-section reports, stitch Recommendation / Summary once.
 */
function buildPrimaryAdvisorContent(
  aiContent: string | null | undefined,
  sections: AskSection[],
): string {
  const raw = (aiContent ?? "").trim();
  if (!raw) return "";

  const hasReportHeadings = /^##\s+/m.test(raw);
  if (!hasReportHeadings || sections.length === 0) {
    return stripReportScaffolding(raw);
  }

  const preferred =
    sections.find((s) => /recommendation|verdict|brief/i.test(s.title)) ??
    sections.find((s) => /summary/i.test(s.title)) ??
    sections[0];

  if (preferred?.content) {
    return preferred.content.trim();
  }

  return stripReportScaffolding(raw);
}

function stripReportScaffolding(markdown: string): string {
  return markdown
    .replace(/^##\s+(Summary|Search Summary|Matching Properties|Nearby Alternatives|Area Analysis|Builder Analysis|Investment Analysis|Confidence Score|Source)\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
  if (t.includes("recommendation") || t.includes("verdict")) return 0;
  if (t.includes("what to watch") || t.includes("trade-off")) return 1;
  if (t.includes("pros") || t.includes("cons")) return 2;
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
  return formatInrAmount(price);
}
