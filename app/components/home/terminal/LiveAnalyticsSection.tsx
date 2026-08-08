"use client";

import MapMiniCharts from "./MapMiniCharts";
import { SkeletonBlock } from "./primitives";
import { useTerminalData } from "./useTerminalData";

/** Live derived analytics — sits after Featured Properties in homepage hierarchy. */
export default function LiveAnalyticsSection() {
  const { loading, bundle } = useTerminalData();
  const nodes = bundle?.mapNodes ?? [];

  return (
    <section className="bg-[#F7F9FB] py-14 sm:py-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#4AAA27]">
          Live derived analytics
        </p>
        {loading && nodes.length === 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-[148px]" />
            ))}
          </div>
        ) : (
          <MapMiniCharts nodes={nodes} />
        )}
      </div>
    </section>
  );
}
