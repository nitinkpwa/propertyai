"use client";

import { useEffect, useState } from "react";
import FadeIn from "../FadeIn";
import SectionHeader from "../SectionHeader";
import GlassCard from "../ui/GlassCard";
import { buildBuilderShowcaseCards, formatPriceShort } from "@/lib/home/marketSignals";
import type { BuilderShowcaseCard } from "@/lib/home/types";
import { getCachedListingProperties } from "@/lib/home/listingsCache";
import { IQ_GREEN } from "../theme";

export default function BuilderIntelligenceSection() {
  const [builders, setBuilders] = useState<BuilderShowcaseCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCachedListingProperties()
      .then((rows) => {
        if (!cancelled) setBuilders(buildBuilderShowcaseCards(rows));
      })
      .catch(() => {
        if (!cancelled) setBuilders([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="Builder Showcase"
            title="Know the builder before you book"
            description="Active inventory and listing-backed averages only. Delivery history and legal status: Ask AreaIQ."
            action={{ label: "Compare builders", href: "/ask?q=Compare+builders+Tricity" }}
          />
        </FadeIn>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-neutral-100" />
            ))}
          </div>
        ) : builders.length === 0 ? (
          <GlassCard href="/ask?q=Most+reliable+builders+Tricity" className="p-8 text-center">
            <p className="font-semibold text-heading-primary">No builder aggregates yet</p>
            <p className="mt-2 text-sm text-muted">
              Ask AreaIQ which builders are most reliable in Tricity.
            </p>
          </GlassCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {builders.map((b) => (
              <GlassCard key={b.id} href={b.href} className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold text-white"
                      style={{ backgroundColor: IQ_GREEN }}
                      aria-hidden
                    >
                      {b.name.slice(0, 1).toUpperCase()}
                    </div>
                    <h3 className="truncate text-lg font-bold text-heading-primary">{b.name}</h3>
                    <p className="mt-1 text-xs text-muted">
                      {b.listingCount} active project{b.listingCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div
                    className="rounded-xl px-3 py-1.5 text-center"
                    style={{ backgroundColor: `${IQ_GREEN}15` }}
                  >
                    <p className="text-lg font-bold tabular-nums" style={{ color: IQ_GREEN }}>
                      {b.avgGrowthScore != null ? Math.round(b.avgGrowthScore) : "—"}
                    </p>
                    <p className="text-[10px] font-semibold uppercase text-muted">Score</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-4 text-sm">
                  <div>
                    <p className="text-xs text-muted">Avg price</p>
                    <p className="font-semibold tabular-nums text-heading-primary">
                      {b.averagePrice != null ? formatPriceShort(b.averagePrice) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Rental yield</p>
                    <p className="font-semibold tabular-nums text-heading-primary">
                      {b.avgRentalYield != null ? `${b.avgRentalYield.toFixed(1)}%` : "—"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-emerald-600">
                      Delivery · quality · legal → Ask AreaIQ
                    </p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
