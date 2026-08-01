"use client";

import type { MarketPulseMetric } from "@/lib/home/terminalTypes";
import {
  BandDot,
  MetricTile,
  SkeletonBlock,
  SparkBars,
  TerminalSectionHeader,
} from "./primitives";

export default function MarketPulseDashboard({
  pulse,
  loading,
  inventorySpark,
}: {
  pulse: MarketPulseMetric[];
  loading: boolean;
  inventorySpark: number[];
}) {
  return (
    <div>
      <TerminalSectionHeader
        eyebrow="Pulse"
        title="Market pulse"
        action={{ label: "Briefing", href: "/ask?q=Tricity+market+briefing" }}
      />
      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {pulse.map((m) => (
            <MetricTile
              key={m.id}
              label={m.label}
              value={m.value}
              href={m.href}
              accent={m.id === "confidence" || m.id === "inventory"}
            >
              <div className="mt-3 flex items-center justify-between gap-2">
                <BandDot band={m.band} />
                {m.id === "inventory" && inventorySpark.length > 0 ? (
                  <SparkBars values={inventorySpark} className="ml-auto" />
                ) : (
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
                    Live
                  </span>
                )}
              </div>
            </MetricTile>
          ))}
        </div>
      )}
    </div>
  );
}
