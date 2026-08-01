"use client";

import FadeIn from "../FadeIn";
import IntelligenceGauges from "./IntelligenceGauges";
import MarketCharts from "./MarketCharts";

export default function IntelligenceChartsSection() {
  return (
    <section className="border-y border-neutral-100 bg-[#F7F9FB] py-14 sm:py-20">
      <div className="mx-auto max-w-7xl space-y-14 px-4 sm:space-y-16 sm:px-6 lg:px-8">
        <FadeIn>
          <IntelligenceGauges />
        </FadeIn>
        <FadeIn>
          <MarketCharts />
        </FadeIn>
      </div>
    </section>
  );
}
