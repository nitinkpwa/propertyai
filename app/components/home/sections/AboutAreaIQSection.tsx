"use client";

import FadeIn from "../FadeIn";
import { BRAND } from "@/lib/brand";
import { IQ_GREEN } from "../theme";

export default function AboutAreaIQSection() {
  return (
    <section className="relative overflow-hidden border-y border-neutral-100 bg-[#F8FFFC] py-16 sm:py-24">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
        style={{ backgroundColor: IQ_GREEN }}
        aria-hidden
      />
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <FadeIn>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            About {BRAND.name}
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
            {BRAND.name}
          </h2>
          <p className="mt-2 text-sm font-medium text-emerald-700">{BRAND.poweredBy}</p>
          <p className="mt-6 text-base leading-relaxed text-heading-primary sm:text-lg">
            {BRAND.about.lead}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
            {BRAND.about.body}
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
