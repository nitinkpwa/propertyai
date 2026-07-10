"use client";

import { useState } from "react";
import type { BHKOption } from "../../../components/PropertyCard";
import type { PropertyDetail } from "../data";
import { formatPrice } from "../data";
import { SectionCard, SectionTitle } from "./shared";

interface FloorPlansProps {
  floorPlans: PropertyDetail["floorPlans"];
}

export default function FloorPlans({ floorPlans }: FloorPlansProps) {
  const tabs = floorPlans.map((fp) => fp.bhk);
  const [active, setActive] = useState<BHKOption>(tabs[0] ?? 2);

  const plan = floorPlans.find((fp) => fp.bhk === active) ?? floorPlans[0];

  return (
    <SectionCard>
      <SectionTitle title="Floor Plans" subtitle="Choose your ideal configuration" />

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((bhk) => (
          <button
            key={bhk}
            type="button"
            onClick={() => setActive(bhk)}
            aria-pressed={active === bhk}
            className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
              active === bhk
                ? "bg-emerald-500 text-white shadow-[0_2px_8px_rgba(34,197,94,0.35)]"
                : "bg-neutral-100 text-body hover:bg-neutral-200"
            }`}
          >
            {bhk} BHK
          </button>
        ))}
      </div>

      {plan && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-br from-neutral-100 via-neutral-50 to-emerald-50/30 sm:rounded-3xl">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
              <div className="grid w-full max-w-xs grid-cols-2 gap-2 opacity-60">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg border-2 border-dashed border-neutral-300 bg-white/50" />
                ))}
              </div>
              <p className="text-sm font-medium text-muted">{plan.label} — Floor Plan</p>
            </div>
          </div>

          <div className="flex flex-col justify-center space-y-4">
            <h3 className="text-lg font-bold text-heading-primary">{plan.label}</h3>
            <dl className="space-y-3">
              <SpecRow label="Configuration" value={`${plan.bhk} BHK`} />
              <SpecRow label="Super Area" value={`${plan.area.toLocaleString("en-IN")} sq ft`} />
              <SpecRow label="Starting Price" value={formatPrice(plan.price)} highlight />
            </dl>
            <button
              type="button"
              className="mt-2 w-fit rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-neutral-800 active:scale-[0.98]"
            >
              Download Brochure
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function SpecRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`text-sm font-semibold ${highlight ? "text-emerald-600" : "text-heading-primary"}`}>{value}</dd>
    </div>
  );
}
