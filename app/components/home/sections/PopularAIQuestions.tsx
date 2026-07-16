"use client";

import FadeIn from "../FadeIn";
import SectionHeader from "../SectionHeader";
import GlassCard from "../ui/GlassCard";
import { POPULAR_AI_QUESTIONS } from "@/lib/home/content";

export default function PopularAIQuestions() {
  return (
    <section className="border-b border-neutral-100 bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="Popular AI Questions"
            title="Ask what buyers actually ask"
            description="Every card opens AreaIQ Assistant with verified database context — never fabricated answers."
            action={{ label: "Open AI Assistant", href: "/ask" }}
          />
        </FadeIn>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {POPULAR_AI_QUESTIONS.map((item) => (
            <GlassCard key={item.id} href={item.href} className="flex min-h-[112px] flex-col justify-between p-5">
              <p className="text-[15px] font-semibold leading-snug text-heading-primary">
                {item.question}
              </p>
              <p className="mt-4 text-xs font-semibold text-emerald-600 opacity-80 transition-opacity group-hover:opacity-100">
                Ask AreaIQ →
              </p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
