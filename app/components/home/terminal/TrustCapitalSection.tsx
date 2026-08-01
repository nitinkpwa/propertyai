"use client";

import FadeIn from "../FadeIn";
import BuilderLeaderboard from "./BuilderLeaderboard";
import InvestmentGauges from "./InvestmentGauges";

export default function TrustCapitalSection() {
  return (
    <section className="border-y border-neutral-100 bg-[#F7F9FB] py-14 sm:py-20">
      <div className="mx-auto max-w-7xl space-y-14 px-4 sm:space-y-16 sm:px-6 lg:px-8">
        <FadeIn>
          <BuilderLeaderboard />
        </FadeIn>
        <FadeIn>
          <InvestmentGauges />
        </FadeIn>
      </div>
    </section>
  );
}
