"use client";

import { motion } from "framer-motion";
import FadeIn from "../FadeIn";
import SectionHeader from "../SectionHeader";
import GlassCard from "../ui/GlassCard";
import { AI_CAPABILITIES } from "../data";
import { IQ_GREEN } from "../theme";

export default function CapabilitiesSection() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="Intelligence"
            title="What AreaIQ Can Do"
            description="Not marketing fluff — real AI capabilities that improve every property decision."
          />
        </FadeIn>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AI_CAPABILITIES.map((cap, i) => (
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.03, duration: 0.4 }}
            >
              <GlassCard href={cap.href} className="h-full p-5">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                  style={{ backgroundColor: `${IQ_GREEN}18` }}
                >
                  {cap.icon}
                </span>
                <p className="mt-4 text-sm font-semibold leading-snug text-heading-primary group-hover:text-emerald-700">
                  {cap.title}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
