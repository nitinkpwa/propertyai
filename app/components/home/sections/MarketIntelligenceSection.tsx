"use client";

import { useEffect, useState } from "react";
import FadeIn from "../FadeIn";
import SectionHeader from "../SectionHeader";
import GlassCard from "../ui/GlassCard";
import { buildMarketSignals } from "@/lib/home/marketSignals";
import type { MarketSignal } from "@/lib/home/types";
import { getCachedListingProperties } from "@/lib/home/listingsCache";
import { IQ_GREEN } from "../theme";

function MarketSignalCard({ signal }: { signal: MarketSignal }) {
  return (
    <GlassCard href={signal.href} className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-label">
          {signal.label}
        </p>
        {signal.kind === "ask" ? (
          <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
            Ask AreaIQ
          </span>
        ) : null}
      </div>
      <p
        className="mt-2 text-lg font-bold tabular-nums text-heading-primary"
        style={signal.value ? { color: IQ_GREEN } : undefined}
      >
        {signal.value ?? "—"}
      </p>
      <p className="mt-1 text-xs text-muted">{signal.hint}</p>
    </GlassCard>
  );
}

export default function MarketIntelligenceSection() {
  const [signals, setSignals] = useState<MarketSignal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCachedListingProperties()
      .then((rows) => {
        if (!cancelled) setSignals(buildMarketSignals(rows));
      })
      .catch(() => {
        if (!cancelled) setSignals(buildMarketSignals([]));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="border-y border-neutral-100 bg-[#F7F9FB] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="Live Market"
            title="Market signals"
            description="Metrics from live inventory when available. Unknown fields open AreaIQ — we never invent numbers."
            action={{ label: "Full market briefing", href: "/ask?q=Latest+Tricity+market+intelligence" }}
          />
        </FadeIn>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl border border-neutral-200/80 bg-white/70"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {signals.map((signal) => (
              <MarketSignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
