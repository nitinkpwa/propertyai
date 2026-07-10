"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import FadeIn from "../FadeIn";
import SectionHeader from "../SectionHeader";
import { NEWS_INTELLIGENCE } from "../data";
import { IQ_GREEN } from "../theme";

export default function NewsIntelligenceSection() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="Daily Intelligence"
            title="News & Market Intelligence"
            description="Not blogs — actionable market signals updated daily."
            action={{ label: "All intelligence", href: "/ask?q=Latest+Tricity+market+news" }}
          />
        </FadeIn>
        <div className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200/80 bg-white">
          {NEWS_INTELLIGENCE.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={item.href}
                className="group flex flex-col gap-2 px-6 py-5 no-underline transition-colors hover:bg-[#F7F9FB] sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: IQ_GREEN }}
                  >
                    {item.category}
                  </span>
                  <p className="mt-1 font-semibold text-heading-primary group-hover:text-emerald-700">
                    {item.title}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted">{item.time}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
