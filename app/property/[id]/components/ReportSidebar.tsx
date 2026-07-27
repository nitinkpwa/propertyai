"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useSavedProperty } from "@/lib/buyer/useSavedProperty";
import LegalTrustBadge from "@/components/property/LegalTrustBadge";
import type { PropertyDetail } from "../data";
import { formatPropertyPrice } from "../data";
import { useBookSiteVisit } from "./BookSiteVisitProvider";
import PropertyAskPanel from "./PropertyAskPanel";
import {
  EMERALD,
  HeartIcon,
  MapPinIcon,
  ShareIcon,
  SparkIcon,
} from "./shared";

interface ReportSidebarProps {
  property: PropertyDetail;
}

export default function ReportSidebar({ property }: ReportSidebarProps) {
  const { saved, toggle, saving } = useSavedProperty(property.id);
  const { requestBookVisit } = useBookSiteVisit();
  const [shared, setShared] = useState(false);
  const scores = property.intelligenceBundle?.scores;

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: property.name,
          text: `Check out ${property.name} on AreaIQ`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      /* cancelled */
    }
  }, [property.name]);

  return (
    <aside className="space-y-4 lg:sticky lg:top-chrome lg:self-start">
      <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        <div className="border-b border-neutral-100 p-5">
          <p className="text-2xl font-bold tracking-tight text-heading-primary">
            {formatPropertyPrice(property)}
          </p>
          {property.pricingDisplay?.rateLabel || property.sizeLabel ? (
            <p className="mt-1 text-sm text-muted">
              {[property.pricingDisplay?.rateLabel, property.sizeLabel].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <LegalTrustBadge compliance={property.legalCompliance} size="sm" />
            {property.aiVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                <SparkIcon className="text-emerald-500" />
                AreaIQ Intelligence
              </span>
            )}
          </div>
          {scores?.areaIq.available ? (
            <p className="mt-3 text-sm font-semibold text-emerald-700">
              AreaIQ Score {scores.areaIq.displayValue}/100
            </p>
          ) : null}
        </div>

        <div className="space-y-3 p-5 text-sm">
          <Row label="Builder" value={property.builder.name} />
          <Row
            label="Location"
            value={`${property.location}, ${property.city}`}
            icon={<MapPinIcon />}
          />
          <Row label="Configuration" value={property.configuration} />
          <Row label="Area" value={`${property.area.toLocaleString("en-IN")} sq ft`} />
          <Row label="Possession" value={property.possession} highlight />

          <button
            type="button"
            onClick={requestBookVisit}
            className="mt-2 flex w-full items-center justify-center rounded-xl px-4 py-3.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(34,197,94,0.35)] transition-all hover:brightness-105 active:scale-[0.98]"
            style={{ backgroundColor: EMERALD }}
          >
            Schedule Property Visit
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-body hover:bg-neutral-50"
            >
              <ShareIcon />
              {shared ? "Copied!" : "Share"}
            </button>
            <button
              type="button"
              onClick={toggle}
              disabled={saving}
              className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold disabled:opacity-60 ${
                saved
                  ? "border-rose-200 bg-rose-50 text-rose-600"
                  : "border-neutral-200 text-body hover:bg-neutral-50"
              }`}
            >
              <HeartIcon filled={saved} />
              {saved ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      </div>

      <PropertyAskPanel property={property} isPrimary />
    </aside>
  );
}

function Row({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span
        className={`flex items-center gap-1 text-right font-medium ${
          highlight ? "text-emerald-700" : "text-heading-primary"
        }`}
      >
        {icon}
        {value}
      </span>
    </div>
  );
}
