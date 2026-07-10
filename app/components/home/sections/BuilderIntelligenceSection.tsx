"use client";

import { motion } from "framer-motion";
import FadeIn from "../FadeIn";
import SectionHeader from "../SectionHeader";
import GlassCard from "../ui/GlassCard";
import { BUILDER_INTELLIGENCE } from "../data";
import { IQ_GREEN } from "../theme";

export default function BuilderIntelligenceSection() {
  return (
    <section className="bg-[#F7F9FB] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="Builder Intelligence"
            title="Know Your Builder Before You Book"
            description="Trust scores, delivery history, and quality ratings — not marketing brochures."
            action={{ label: "Compare builders", href: "/ask?q=Compare+builders+Tricity" }}
          />
        </FadeIn>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BUILDER_INTELLIGENCE.map((b, i) => (
            <motion.div
              key={b.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <GlassCard href={b.href} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-heading-primary">{b.name}</h3>
                    <p className="mt-1 text-xs text-muted">
                      {b.completed} delivered · {b.delayed} delayed
                    </p>
                  </div>
                  <div
                    className="rounded-xl px-3 py-1.5 text-center"
                    style={{ backgroundColor: `${IQ_GREEN}15` }}
                  >
                    <p className="text-lg font-bold tabular-nums" style={{ color: IQ_GREEN }}>
                      {b.trustScore}
                    </p>
                    <p className="text-[10px] font-semibold uppercase text-muted">Trust</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-neutral-100 pt-4">
                  <div>
                    <p className="text-xs text-muted">Quality</p>
                    <p className="text-sm font-bold text-heading-primary">{b.quality}/100</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Satisfaction</p>
                    <p className="text-sm font-bold text-heading-primary">{b.satisfaction}/5</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Legal</p>
                    <p className="text-sm font-bold text-emerald-600">Clear</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
