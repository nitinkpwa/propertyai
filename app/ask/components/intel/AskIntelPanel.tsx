"use client";

import type { PropertyContext } from "@/lib/ask/client";
import type { AskChatMessage } from "@/lib/ask/conversations/types";
import { turnFromMessage } from "../../lib/turnFromMessage";
import { LoadingSidebar } from "../loading/LoadingSidebar";
import { AskIntelArea } from "./AskIntelArea";
import { AskIntelBuilder } from "./AskIntelBuilder";
import { AskIntelCompare } from "./AskIntelCompare";
import { AskIntelInvestment } from "./AskIntelInvestment";
import { AskIntelRera } from "./AskIntelRera";
import { AskPropertyCarousel } from "./AskPropertyCarousel";

interface AskIntelPanelProps {
  latestAssistant: AskChatMessage | null;
  propertyContext: PropertyContext | null;
  loading: boolean;
  onAction: (q: string) => void;
  onClose?: () => void;
  /** Desktop side column vs mobile/tablet bottom sheet */
  presentation?: "panel" | "sheet";
}

const MARKET_TODAY = [
  { label: "Tricity demand", value: "Active" },
  { label: "Hot corridor", value: "Aerocity / Airport Rd" },
  { label: "Buyer focus", value: "3 BHK ready" },
  { label: "Yield watch", value: "Mohali IT belt" },
];

export function AskIntelPanel({
  latestAssistant,
  propertyContext,
  loading,
  onAction,
  onClose,
  presentation = "panel",
}: AskIntelPanelProps) {
  const turn = latestAssistant ? turnFromMessage(latestAssistant) : null;
  const intent = turn?.intent ?? null;
  const engineIntent = latestAssistant?.intent ?? "";

  const showProperties = (turn?.listings.length ?? 0) > 0;
  const showBuilder =
    intent === "builder" ||
    engineIntent === "BUILDER" ||
    Boolean(latestAssistant?.content?.toLowerCase().includes("builder"));
  const showArea =
    intent === "locality" ||
    intent === "market" ||
    engineIntent === "LOCALITY" ||
    engineIntent === "MARKET_TREND";
  const showInvestment =
    intent === "investment" || engineIntent === "INVESTMENT" || engineIntent === "FINANCE";
  const showLoan = engineIntent === "FINANCE" || /emi|loan|mortgage/i.test(latestAssistant?.content ?? "");
  const showCompare = intent === "compare" || engineIntent === "COMPARE";
  const showLegal = /rera|legal|litigation|title/i.test(
    `${latestAssistant?.content ?? ""} ${turn?.headline ?? ""}`,
  );

  const areaName =
    latestAssistant?.location ||
    extractEntity(latestAssistant?.content ?? "", [
      "Panchkula Extension 2",
      "Panchkula Extension 1",
      "Amravati Enclave",
      "Aerocity",
      "Mohali",
      "New Chandigarh",
      "Zirakpur",
      "Panchkula",
      "Kharar",
    ]) ||
    propertyContext?.location ||
    null;

  const builderName =
    latestAssistant?.builder ||
    extractBuilder(latestAssistant?.content ?? "") ||
    propertyContext?.builderName ||
    null;

  const isSheet = presentation === "sheet";

  return (
    <aside
      className={`flex h-full min-h-0 w-full flex-col bg-[#FAFBFA] ${
        isSheet ? "border-0" : "border-l border-neutral-200/80"
      }`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200/80 px-4 py-3.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Dynamic intelligence
          </p>
          <p className="text-sm font-bold text-heading-primary">
            {loading
              ? "Researching with you"
              : intent
                ? intentLabel(intent)
                : "Market pulse"}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-neutral-200 lg:hidden"
            aria-label="Close intelligence panel"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 pb-safe">
        {loading ? <LoadingSidebar active /> : null}

        {!loading && propertyContext && !latestAssistant ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
              Focused property
            </p>
            <p className="mt-1 font-bold text-heading-primary">{propertyContext.name}</p>
            <p className="text-xs text-muted">
              {propertyContext.location}, {propertyContext.city}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                "Is this good for investment?",
                "Best negotiation price?",
                "Hidden risks?",
              ].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onAction(q)}
                  className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-100"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {!loading && showProperties && turn ? (
          <AskPropertyCarousel
            listings={turn.listings}
            rationales={turn.propertyRationales}
            onAskAbout={onAction}
          />
        ) : null}

        {!loading && showCompare ? (
          <AskIntelCompare listings={turn?.listings ?? []} onAction={onAction} />
        ) : null}

        {!loading && showBuilder ? (
          <AskIntelBuilder builderName={builderName} onAction={onAction} />
        ) : null}

        {!loading && showArea ? (
          <AskIntelArea
            areaName={areaName}
            stats={turn?.stats ?? null}
            onAction={onAction}
          />
        ) : null}

        {!loading && (showInvestment || showLoan) ? (
          <AskIntelInvestment
            defaultPrice={turn?.listings[0]?.price ?? propertyContext?.price ?? null}
            mode={showLoan && !showInvestment ? "loan" : "investment"}
            onAction={onAction}
          />
        ) : null}

        {!loading && showLegal ? <AskIntelRera onAction={onAction} /> : null}

        {!loading && !showProperties && !showBuilder && !showArea && !showInvestment && !showCompare && !showLegal ? (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-label">Market today</p>
            <div className="grid grid-cols-2 gap-2">
              {MARKET_TODAY.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-neutral-100 bg-white px-3 py-2.5 shadow-sm"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-label">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs font-bold text-heading-primary">{item.value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-label">Trending</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Top investments Mohali",
                "Hot projects Aerocity",
                "Price changes Tricity",
                "Best rental yield",
              ].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onAction(q)}
                  className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-body hover:border-emerald-300 hover:bg-emerald-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function intentLabel(intent: string): string {
  switch (intent) {
    case "search":
      return "Property search";
    case "builder":
      return "Builder intel";
    case "locality":
      return "Area intel";
    case "investment":
      return "Investment tools";
    case "compare":
      return "Comparison";
    case "market":
      return "Market signals";
    case "analysis":
      return "Property analysis";
    default:
      return "Intelligence";
  }
}

function extractEntity(text: string, candidates: string[]): string | null {
  for (const c of candidates) {
    if (text.toLowerCase().includes(c.toLowerCase())) return c;
  }
  return null;
}

function extractBuilder(text: string): string | null {
  const match = text.match(
    /\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}\s+(?:Builders?|Developers?|Group))\b/,
  );
  return match?.[1]?.trim() ?? null;
}
