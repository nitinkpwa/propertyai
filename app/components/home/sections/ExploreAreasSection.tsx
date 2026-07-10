"use client";

import { motion } from "framer-motion";
import FadeIn from "../FadeIn";
import SectionHeader from "../SectionHeader";
import GlassCard from "../ui/GlassCard";
import { EXPLORE_AREAS_EXTENDED } from "../data";
import { IQ_GREEN } from "../theme";

export default function ExploreAreasSection() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="Area Intelligence"
            title="Explore Areas"
            description="Click any micro-market for AI-powered area intelligence — not just listings."
            action={{ label: "Compare areas", href: "/ask?q=Compare+areas+Tricity" }}
          />
        </FadeIn>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EXPLORE_AREAS_EXTENDED.map((area, i) => (
            <motion.div
              key={area.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <GlassCard href={area.href} className="relative overflow-hidden p-6">
                <div
                  className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-20"
                  style={{ background: `radial-gradient(circle, ${IQ_GREEN}, transparent)` }}
                />
                <p className="text-xs font-semibold uppercase tracking-wide text-label">{area.tag}</p>
                <h3 className="mt-1 text-xl font-bold text-heading-primary">{area.name}</h3>
                <div className="mt-4 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${area.score}%`, backgroundColor: IQ_GREEN }}
                    />
                  </div>
                  <span className="text-sm font-bold tabular-nums" style={{ color: IQ_GREEN }}>
                    {area.score}
                  </span>
                </div>
                <p className="mt-3 text-xs font-semibold text-emerald-600 opacity-0 transition-opacity group-hover:opacity-100">
                  Open Area Intelligence →
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
