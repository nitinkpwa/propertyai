"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Heart, Scale, Sparkles } from "lucide-react";
import { useSavedPropertyToggle } from "@/lib/buyer/useSavedProperty";
import { useComparedProperty } from "@/lib/buyer/useComparedProperty";
import LegalTrustBadge from "@/components/property/LegalTrustBadge";
import PropertyCardMediaChrome from "@/components/property/PropertyCardMediaChrome";
import { formatPriceShort } from "@/lib/home/marketSignals";
import type { IntelligencePropertyCardModel } from "@/lib/home/types";
import {
  CONFIDENCE_TOOLTIP,
  SCORE_TONE_COLORS,
  scoreToneFromValue,
} from "@/lib/scoring/score-utils";
import { IQ_GREEN } from "./theme";

type Props = {
  property: IntelligencePropertyCardModel;
};

function ScoreBadge({
  label,
  score,
  kind,
}: {
  label: string;
  score: number | null | undefined;
  kind: "quality" | "legal";
}) {
  const available = score != null && Number.isFinite(score);
  const tone = scoreToneFromValue(available ? score : null, kind);
  const colors = SCORE_TONE_COLORS[tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur-md"
      style={{
        backgroundColor: available ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.45)",
        color: available ? colors.text : "#fff",
      }}
    >
      {kind === "quality" ? (
        <Sparkles className="h-3 w-3" aria-hidden />
      ) : (
        <Scale className="h-3 w-3" aria-hidden />
      )}
      {label} {available ? Math.round(score!) : "—"}
    </span>
  );
}

export default function IntelligencePropertyCard({ property }: Props) {
  const { isSaved, handleFavoriteToggle } = useSavedPropertyToggle();
  const { compared, addAndGo, busy } = useComparedProperty(property.id);
  const saved = isSaved(property.id);
  const [expanded, setExpanded] = useState(false);

  const onSave = async () => {
    await handleFavoriteToggle(property.id, !saved);
  };

  const onCompare = async () => {
    await addAndGo();
  };

  const tone = scoreToneFromValue(property.areaIqScore ?? null, "quality");
  const toneColor = SCORE_TONE_COLORS[tone].text;

  return (
    <article className="group flex h-full w-[min(320px,85vw)] shrink-0 flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.1)] sm:w-[340px]">
      <Link
        href={property.href}
        className="relative block aspect-[4/3] shrink-0 overflow-hidden bg-neutral-100 no-underline"
      >
        {property.imageUrl ? (
          <Image
            src={property.imageUrl}
            alt={property.imageAlt ?? property.name}
            fill
            sizes="340px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="flex h-full w-full items-end bg-gradient-to-br from-neutral-700 via-neutral-600 to-emerald-700/50 p-4"
            aria-hidden
          >
            <span className="text-shadow-photo text-sm font-semibold text-white/90">
              {property.name}
            </span>
          </div>
        )}

        <PropertyCardMediaChrome
          brandMarkSize={26}
          topLeft={
            <>
              <ScoreBadge label="AreaIQ" score={property.areaIqScore} kind="quality" />
              <ScoreBadge label="Legal" score={property.legalScore} kind="legal" />
            </>
          }
          bottomRight={
            <LegalTrustBadge
              compliance={property.legalCompliance}
              flags={property.legalFlags}
              size="sm"
            />
          }
        />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={property.href}
              className="line-clamp-2 min-h-[2.75rem] text-[15px] font-bold leading-snug text-heading-primary no-underline hover:text-emerald-700"
            >
              {property.name}
            </Link>
            <p className="mt-1 min-h-4 truncate text-xs text-muted">
              {property.location}
              {property.city ? ` · ${property.city}` : ""}
            </p>
            <p className="mt-1 min-h-4 truncate text-xs font-medium uppercase tracking-wider text-muted">
              {property.builderName ? `by ${property.builderName}` : "\u00a0"}
            </p>
          </div>
          <p
            className="shrink-0 text-base font-bold tabular-nums"
            style={{ color: IQ_GREEN }}
          >
            {formatPriceShort(property.price)}
          </p>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
          <Link
            href={`${property.href}?bookVisit=1`}
            className="inline-flex min-h-10 items-center justify-center rounded-xl text-xs font-bold text-white no-underline"
            style={{ backgroundColor: IQ_GREEN }}
          >
            Book Visit
          </Link>
          <Link
            href={property.askHref}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-label no-underline hover:bg-neutral-50"
          >
            Ask AI
          </Link>
          <button
            type="button"
            onClick={onCompare}
            disabled={busy}
            className={`inline-flex min-h-10 items-center justify-center rounded-xl border text-xs font-semibold disabled:opacity-60 ${
              compared
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-neutral-200 bg-white text-label hover:bg-neutral-50"
            }`}
          >
            {busy ? "…" : compared ? "In Compare" : "Compare"}
          </button>
          <button
            type="button"
            onClick={onSave}
            className={`inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border text-xs font-semibold ${
              saved
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-neutral-200 bg-white text-label hover:bg-neutral-50"
            }`}
          >
            <Heart
              className="h-3.5 w-3.5"
              fill={saved ? "currentColor" : "none"}
              aria-hidden
            />
            {saved ? "Saved" : "Save"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 inline-flex items-center justify-center gap-1 text-[11px] font-semibold text-muted"
          aria-expanded={expanded}
        >
          Details
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>

        {expanded ? (
          <div className="mt-2 space-y-2 rounded-xl bg-[#F7F9FB] p-3 text-xs">
            <p className="text-body">
              {property.bhk} BHK
              {property.area
                ? ` · ${property.area.toLocaleString("en-IN")} ${property.areaUnit ?? "sqft"}`
                : ""}
            </p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted">AreaIQ</span>
              <span className="font-bold tabular-nums" style={{ color: toneColor }}>
                {property.areaIqScore != null
                  ? `${Math.round(property.areaIqScore)} · ${property.areaIqLabel ?? ""}`
                  : "Insufficient Data"}
              </span>
            </div>
            {property.areaIqConfidence != null ? (
              <p
                className="cursor-help text-[10px] text-neutral-500 underline decoration-dotted"
                title={`Confidence\n${Math.round(property.areaIqConfidence)}%\n\n${CONFIDENCE_TOOLTIP}`}
              >
                Confidence {Math.round(property.areaIqConfidence)}%
              </p>
            ) : null}
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted">Legal</span>
              <span className="font-bold tabular-nums">
                {property.legalScore != null
                  ? `${Math.round(property.legalScore)}% · ${property.legalScoreLabel ?? ""}`
                  : "Insufficient Data"}
              </span>
            </div>
            {property.rentalYield != null ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted">Yield</span>
                <span className="font-bold tabular-nums">
                  {property.rentalYield.toFixed(1)}%
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
