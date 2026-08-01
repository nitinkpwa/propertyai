"use client";

import FadeIn from "../FadeIn";
import AreaComparisonTable from "./AreaComparisonTable";
import PriceHeatmap from "./PriceHeatmap";

export default function MarketGeographySection() {
  return (
    <section className="bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-7xl space-y-14 px-4 sm:space-y-16 sm:px-6 lg:px-8">
        <FadeIn>
          <PriceHeatmap />
        </FadeIn>
        <FadeIn>
          <AreaComparisonTable />
        </FadeIn>
      </div>
    </section>
  );
}
