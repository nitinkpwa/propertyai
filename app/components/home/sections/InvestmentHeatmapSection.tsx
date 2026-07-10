"use client";

import { motion } from "framer-motion";
import FadeIn from "../FadeIn";
import SectionHeader from "../SectionHeader";
import GlassCard from "../ui/GlassCard";
import { HEATMAP_ZONES } from "../data";

const STATUS_STYLES = {
  Hot: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-500" },
  Growing: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  Stable: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
  Avoid: { bg: "bg-neutral-100", text: "text-body", border: "border-neutral-200", dot: "bg-neutral-400" },
} as const;

export default function InvestmentHeatmapSection() {
  return (
    <section className="border-y border-neutral-100 bg-[#F7F9FB] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="Investment Map"
            title="Investment Heatmap"
            description="Where to buy, where to wait, and where to avoid — with AI reasoning."
            action={{ label: "Full heatmap analysis", href: "/ask?q=Investment+heatmap+Tricity" }}
          />
        </FadeIn>

        <div className="mb-8 flex flex-wrap gap-3">
          {(["Hot", "Growing", "Stable", "Avoid"] as const).map((status) => {
            const s = STATUS_STYLES[status];
            return (
              <span key={status} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${s.bg} ${s.text} ${s.border}`}>
                <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                {status}
              </span>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HEATMAP_ZONES.map((zone, i) => {
            const s = STATUS_STYLES[zone.status];
            return (
              <motion.div
                key={zone.area}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassCard href={zone.href} className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold text-heading-primary">{zone.area}</h3>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${s.bg} ${s.text} ${s.border}`}>
                      {zone.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{zone.reason}</p>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
