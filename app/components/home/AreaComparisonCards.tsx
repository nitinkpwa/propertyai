"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import FadeIn from "./FadeIn";
import SectionHeader from "./SectionHeader";
import { AREA_COMPARISONS } from "./data";
import { IQ_GREEN } from "./theme";

export default function AreaComparisonCards() {
  return (
    <section className="bg-[#F7F9FB] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="Compare"
            title="Compare Areas"
            description="Side-by-side intelligence — run a deeper AI comparison with one click."
            action={{ label: "Custom compare", href: "/ask?q=Compare+two+areas+Tricity" }}
          />
        </FadeIn>
        <div className="grid gap-6 lg:grid-cols-2">
          {AREA_COMPARISONS.map((item, i) => {
            const [areaA, areaB] = item.title.split(" vs ");
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
              >
                <Link
                  href={item.href}
                  className="group block rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] no-underline transition-shadow hover:shadow-lg sm:p-8"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-xl font-bold text-heading-primary">{item.title}</h3>
                    <span
                      className="text-sm font-semibold opacity-0 transition-opacity group-hover:opacity-100"
                      style={{ color: IQ_GREEN }}
                    >
                      Ask AreaIQ →
                    </span>
                  </div>
                  <div className="mt-6 overflow-hidden rounded-xl border border-neutral-100">
                    <div className="grid grid-cols-3 bg-[#F7F9FB] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                      <span>Metric</span>
                      <span className="text-center">{areaA}</span>
                      <span className="text-center">{areaB}</span>
                    </div>
                    {item.metrics.map((m) => (
                      <div
                        key={m.label}
                        className="grid grid-cols-3 border-t border-neutral-100 px-4 py-3 text-sm"
                      >
                        <span className="font-medium text-muted">{m.label}</span>
                        <span className="text-center font-semibold text-heading-secondary">{m.a}</span>
                        <span className="text-center font-semibold text-heading-secondary">{m.b}</span>
                      </div>
                    ))}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
