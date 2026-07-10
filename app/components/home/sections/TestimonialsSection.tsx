"use client";

import { motion } from "framer-motion";
import FadeIn from "../FadeIn";
import SectionHeader from "../SectionHeader";
import GlassCard from "../ui/GlassCard";
import { TESTIMONIALS } from "../data";

export default function TestimonialsSection() {
  return (
    <section className="bg-[#F7F9FB] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="Outcomes"
            title="Better Decisions, Real Results"
            description="AreaIQ users don't just find properties — they buy with confidence."
          />
        </FadeIn>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <GlassCard className="flex h-full flex-col p-6">
                <span className="text-2xl">{t.icon}</span>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-body">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-4 border-t border-neutral-100 pt-4">
                  <p className="text-sm font-semibold text-heading-primary">{t.name}</p>
                  <p className="text-xs text-muted">{t.role}</p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
