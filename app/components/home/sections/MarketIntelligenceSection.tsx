"use client";

import { motion } from "framer-motion";
import FadeIn from "../FadeIn";
import SectionHeader from "../SectionHeader";
import GlassCard from "../ui/GlassCard";
import { MARKET_INTELLIGENCE_CARDS } from "../data";
import { IQ_GREEN } from "../theme";

export default function MarketIntelligenceSection() {
  return (
    <section className="border-y border-neutral-100 bg-[#F7F9FB] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="Live Intelligence"
            title="Market Intelligence"
            description="Real-time signals across Tricity — click any card for AI deep-dive."
            action={{ label: "Full market report", href: "/ask?q=Latest+Tricity+market+intelligence" }}
          />
        </FadeIn>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {MARKET_INTELLIGENCE_CARDS.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04, duration: 0.35 }}
            >
              <GlassCard href={card.href} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xl">{card.icon}</span>
                  <span className="text-lg font-bold tabular-nums" style={{ color: IQ_GREEN }}>
                    {card.value}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-heading-primary">{card.label}</p>
                <p className="mt-0.5 text-xs text-muted">{card.trend}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
