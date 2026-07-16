"use client";

import FadeIn from "../FadeIn";
import SectionHeader from "../SectionHeader";
import GlassCard from "../ui/GlassCard";
import { WHY_AREAIQ_ITEMS } from "@/lib/home/content";
import { IQ_GREEN } from "../theme";

export default function WhyAreaIQSection() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="Why AreaIQ"
            title="Intelligence before listings"
            description="Every capability exists to reduce risk and decision friction — not to fill a portal with ads."
          />
        </FadeIn>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {WHY_AREAIQ_ITEMS.map((item) => (
            <GlassCard key={item.id} href={item.href} className="p-5">
              <span
                className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: IQ_GREEN }}
                aria-hidden
              >
                ✦
              </span>
              <h3 className="text-sm font-bold text-heading-primary">{item.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{item.description}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
