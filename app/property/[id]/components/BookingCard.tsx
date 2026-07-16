"use client";

import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { useSavedProperty } from "@/lib/buyer/useSavedProperty";
import type { PropertyDetail } from "../data";
import { formatPrice } from "../data";
import { useBookSiteVisit } from "./BookSiteVisitProvider";
import {
  EMERALD,
  HeartIcon,
  MapPinIcon,
  ShareIcon,
  ShieldIcon,
  SparkIcon,
} from "./shared";

interface BookingCardProps {
  property: PropertyDetail;
}

export default function BookingCard({ property }: BookingCardProps) {
  const { saved, toggle, saving } = useSavedProperty(property.id);
  const { requestBookVisit } = useBookSiteVisit();
  const [shared, setShared] = useState(false);

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
      /* user cancelled */
    }
  }, [property.name]);

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:rounded-3xl">
        <div className="border-b border-neutral-100 p-5 sm:p-6">
          <p className="text-2xl font-bold tracking-tight text-heading-primary sm:text-3xl">
            {formatPrice(property.price)}
          </p>
          <p className="mt-1 text-sm text-muted">
            ₹{property.pricePerSqFt.toLocaleString("en-IN")} / sq ft
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {property.aiVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                <SparkIcon className="text-emerald-500" />
                AI Verified
              </span>
            )}
            {property.reraVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                <ShieldIcon className="text-blue-600" />
                RERA
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <div className="space-y-3 text-sm">
            <Row label="Builder" value={property.builder.name} />
            <Row label="Location" value={`${property.location}, ${property.city}`} icon={<MapPinIcon />} />
            <Row label="Type" value={property.propertyType} />
            <Row label="Configuration" value={`${property.bhk} BHK`} />
            <Row label="Area" value={`${property.area.toLocaleString("en-IN")} sq ft`} />
            <Row label="Status" value={property.status} highlight />
          </div>

          <p className="text-xs leading-relaxed text-muted">
            Schedule a guided property visit. Contact details are shared only after your request is
            approved.
          </p>

          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={requestBookVisit}
              className="flex w-full items-center justify-center rounded-xl px-4 py-3.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(34,197,94,0.35)] transition-all hover:shadow-[0_4px_14px_rgba(34,197,94,0.45)] hover:brightness-105 active:scale-[0.98]"
              style={{ backgroundColor: EMERALD }}
            >
              Schedule Property Visit
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-body transition-all hover:bg-neutral-50 active:scale-[0.98]"
              >
                <ShareIcon />
                {shared ? "Copied!" : "Share"}
              </button>
              <button
                type="button"
                onClick={toggle}
                disabled={saving}
                aria-pressed={saved}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60 ${
                  saved
                    ? "border-rose-200 bg-rose-50 text-rose-600"
                    : "border-neutral-200 text-body hover:bg-neutral-50"
                }`}
              >
                <HeartIcon filled={saved} />
                {saving ? "Saving..." : saved ? "Saved" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
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
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span
        className={`flex items-center gap-1 text-right font-medium ${
          highlight ? "text-emerald-600" : "text-heading-primary"
        }`}
      >
        {icon}
        {value}
      </span>
    </div>
  );
}
