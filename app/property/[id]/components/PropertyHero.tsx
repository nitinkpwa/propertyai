"use client";

import { useCallback, useState } from "react";
import { useSavedProperty } from "@/lib/buyer/useSavedProperty";
import { useComparedProperty } from "@/lib/buyer/useComparedProperty";
import LegalTrustBadge from "@/components/property/LegalTrustBadge";
import type { PropertyDetail } from "../data";
import { formatPropertyPrice } from "../data";
import { useBookSiteVisit } from "./BookSiteVisitProvider";
import PropertyGallery from "./PropertyGallery";
import {
  EMERALD,
  HeartIcon,
  MapPinIcon,
  scoreTone,
  ShareIcon,
  SparkIcon,
} from "./shared";

interface PropertyHeroProps {
  property: PropertyDetail;
  onAskAi?: () => void;
}

function ScoreChip({
  label,
  value,
  available,
  displayValue,
}: {
  label: string;
  value: number | null;
  available: boolean;
  displayValue?: string;
}) {
  const tone = available && value !== null ? scoreTone(value) : scoreTone(0);
  return (
    <div
      className={`min-w-[104px] max-w-[140px] rounded-xl border px-3 py-2.5 ${
        available ? `${tone.bg} border-transparent` : "border-neutral-200 bg-neutral-50"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-label">{label}</p>
      {(available && value !== null) ||
      (available && displayValue && (displayValue.includes("%–") || displayValue.includes("%-"))) ? (
        <p className={`mt-0.5 text-lg font-bold tabular-nums ${tone.text}`}>
          {displayValue && (displayValue.includes("%–") || displayValue.includes("%-"))
            ? displayValue
            : value}
          {value !== null && !(displayValue?.includes("%")) ? (
            <span className="text-xs font-medium text-muted">/100</span>
          ) : null}
        </p>
      ) : (
        <p className="mt-0.5 text-[11px] font-semibold leading-snug text-muted">
          Insufficient verified data
        </p>
      )}
    </div>
  );
}

export default function PropertyHero({ property, onAskAi }: PropertyHeroProps) {
  const { saved, toggle, saving } = useSavedProperty(property.id);
  const { compared, addAndGo, busy: comparing } = useComparedProperty(
    property.id,
  );
  const { requestBookVisit } = useBookSiteVisit();
  const [shared, setShared] = useState(false);

  const scores = property.intelligenceBundle?.scores;

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const text = `Check out ${property.name} on AreaIQ`;
    try {
      if (navigator.share) {
        await navigator.share({ title: property.name, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      /* cancelled */
    }
  }, [property.name]);

  const handleCompare = useCallback(async () => {
    await addAndGo();
  }, [addAndGo]);

  const scrollToAsk = useCallback(() => {
    if (onAskAi) {
      onAskAi();
      return;
    }
    document
      .getElementById("property-ask-panel")
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [onAskAi]);

  return (
    <section className="space-y-5 sm:space-y-6">
      <PropertyGallery images={property.images} propertyName={property.name} />

      <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <LegalTrustBadge compliance={property.legalCompliance} />
              {property.aiVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  <SparkIcon className="text-emerald-500" />
                  AreaIQ Intelligence
                </span>
              )}
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-body">
                {property.status}
              </span>
            </div>

            <h1 className="mt-3 text-[28px] font-bold tracking-tight text-heading-primary sm:text-3xl lg:text-4xl">
              {property.name}
            </h1>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted sm:text-base">
              <MapPinIcon className="shrink-0 text-emerald-600" />
              {property.location}, {property.city}
              <span className="text-neutral-300">·</span>
              {property.builder.name}
            </p>

            <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-3xl font-bold tracking-tight text-heading-primary sm:text-4xl">
                {formatPropertyPrice(property)}
              </p>
              <p className="text-sm text-muted">
                {[
                  property.pricingDisplay?.rateLabel,
                  property.configuration,
                  property.sizeLabel ||
                    (!/plot/i.test(property.propertyType) && property.area > 0
                      ? `${property.area.toLocaleString("en-IN")} sq ft`
                      : null),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
        </div>

        {scores ? (
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1 scrollbar-thin sm:flex-wrap sm:overflow-visible">
            <ScoreChip label="AreaIQ" value={scores.areaIq.value} available={scores.areaIq.available} />
            <ScoreChip
              label="Investment"
              value={scores.investment.value}
              available={scores.investment.available}
            />
            <ScoreChip label="Legal" value={scores.legal.value} available={scores.legal.available} />
            <ScoreChip label="Builder" value={scores.builder.value} available={scores.builder.available} />
            <ScoreChip label="Location" value={scores.location.value} available={scores.location.available} />
            <ScoreChip label="Rental" value={scores.rental.value} available={scores.rental.available} />
            <ScoreChip
              label="Appreciation"
              value={scores.futureGrowth.value}
              available={scores.futureGrowth.available}
              displayValue={scores.futureGrowth.displayValue}
            />
          </div>
        ) : null}

        <div className="mt-6 hidden flex-wrap gap-2.5 lg:flex">
          <button
            type="button"
            onClick={requestBookVisit}
            className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(34,197,94,0.35)] transition-all hover:brightness-105 active:scale-[0.98]"
            style={{ backgroundColor: EMERALD }}
          >
            Book Visit
          </button>
          <button
            type="button"
            onClick={scrollToAsk}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-800 transition-all hover:bg-emerald-100 active:scale-[0.98]"
          >
            <SparkIcon className="text-emerald-600" size={14} />
            Ask AreaIQ
          </button>
          <button
            type="button"
            onClick={handleCompare}
            disabled={comparing}
            aria-pressed={compared}
            className={`inline-flex items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60 ${
              compared
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-neutral-200 text-body hover:bg-neutral-50"
            }`}
          >
            {comparing ? "Updating…" : compared ? "In Compare" : "Compare"}
          </button>
          <button
            type="button"
            onClick={toggle}
            disabled={saving}
            aria-pressed={saved}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 py-3 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60 ${
              saved
                ? "border-rose-200 bg-rose-50 text-rose-600"
                : "border-neutral-200 text-body hover:bg-neutral-50"
            }`}
          >
            <HeartIcon filled={saved} />
            {saved ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-body transition-all hover:bg-neutral-50 active:scale-[0.98]"
          >
            <ShareIcon />
            {shared ? "Copied!" : "Share"}
          </button>
        </div>
      </div>
    </section>
  );
}
