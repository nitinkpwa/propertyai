"use client";

import { useEffect, useState } from "react";
import FadeIn from "../FadeIn";
import SectionHeader from "../SectionHeader";
import GlassCard from "../ui/GlassCard";
import { buildAreaIntelligenceCards, formatPriceShort } from "@/lib/home/marketSignals";
import type { AreaIntelligenceCard } from "@/lib/home/types";
import { fetchListingProperties } from "@/lib/properties/queries";
import { IQ_GREEN } from "../theme";

export default function ExploreAreasSection() {
  const [areas, setAreas] = useState<AreaIntelligenceCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchListingProperties()
      .then((rows) => {
        if (!cancelled) setAreas(buildAreaIntelligenceCards(rows));
      })
      .catch(() => {
        if (!cancelled) setAreas([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="bg-[#F7F9FB] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="Area Intelligence"
            title="Know the micro-market"
            description="Scores and averages only when present on live listings. Everything else → Ask AI."
            action={{ label: "Compare areas", href: "/ask?q=Compare+areas+Tricity" }}
          />
        </FadeIn>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-white/80" />
            ))}
          </div>
        ) : areas.length === 0 ? (
          <GlassCard href="/ask?q=Area+intelligence+Tricity" className="p-8 text-center">
            <p className="font-semibold text-heading-primary">No area aggregates yet</p>
            <p className="mt-2 text-sm text-muted">
              Ask AreaIQ for Tricity area intelligence while inventory grows.
            </p>
          </GlassCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map((area) => (
              <GlassCard key={area.id} href={area.href} className="relative overflow-hidden p-6">
                <div
                  className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-20"
                  style={{ background: `radial-gradient(circle, ${IQ_GREEN}, transparent)` }}
                />
                <p className="text-xs font-semibold uppercase tracking-wide text-label">
                  {area.listingCount} listing{area.listingCount === 1 ? "" : "s"}
                </p>
                <h3 className="mt-1 text-xl font-bold text-heading-primary">{area.name}</h3>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Avg price</dt>
                    <dd className="font-semibold tabular-nums text-heading-primary">
                      {area.averagePrice != null ? formatPriceShort(area.averagePrice) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Investment score</dt>
                    <dd className="font-semibold tabular-nums" style={{ color: IQ_GREEN }}>
                      {area.avgGrowthScore != null
                        ? Math.round(area.avgGrowthScore)
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Rental yield</dt>
                    <dd className="font-semibold tabular-nums text-heading-primary">
                      {area.avgRentalYield != null
                        ? `${area.avgRentalYield.toFixed(1)}%`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Deeper intel</dt>
                    <dd className="font-semibold text-emerald-600">Ask AI →</dd>
                  </div>
                </dl>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
