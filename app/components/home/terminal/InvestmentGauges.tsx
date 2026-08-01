"use client";

import { RadialGauge, SkeletonBlock, TerminalSectionHeader } from "./primitives";
import { useTerminalData } from "./useTerminalData";

export default function InvestmentGauges() {
  const { loading, bundle } = useTerminalData();
  const gauges = bundle?.investmentGauges ?? [];

  return (
    <div>
      <TerminalSectionHeader
        eyebrow="Portfolio"
        title="Investment dashboard"
        action={{ label: "Deep dive", href: "/ask?q=Investment+dashboard+Tricity" }}
      />
      {loading && gauges.length === 0 ? (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="mx-auto h-36 w-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {gauges.map((g) => (
            <RadialGauge
              key={g.id}
              value={g.value}
              label={g.label}
              href={g.href}
              size={100}
            />
          ))}
        </div>
      )}
    </div>
  );
}
