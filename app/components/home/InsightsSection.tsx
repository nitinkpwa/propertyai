"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import FadeIn from "./FadeIn";
import SectionHeader from "./SectionHeader";
import { INSIGHTS } from "./data";
import { IQ_GREEN } from "./theme";

export default function InsightsSection() {
  return (
    <section className="bg-[#F7F9FB] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="AreaIQ Insights"
            title="Intelligence Briefings"
            action={{ label: "All insights", href: "/ask?q=Latest+AreaIQ+insights+Tricity" }}
          />
        </FadeIn>
        <div className="grid gap-6 md:grid-cols-3">
          {INSIGHTS.map((article, index) => (
            <motion.div
              key={article.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
              whileHover={{ y: -6 }}
            >
              <Link
                href={article.href}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] no-underline transition-shadow hover:shadow-lg"
              >
                <div
                  className={`relative h-44 bg-gradient-to-br ${
                    index === 0
                      ? "from-emerald-100 to-white"
                      : index === 1
                        ? "from-sky-100 to-white"
                        : "from-amber-50 to-white"
                  } p-6`}
                >
                  <span className="inline-block rounded-full bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-600 shadow-sm">
                    {article.category}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="text-xs text-neutral-400">{article.readTime} read</p>
                  <h3 className="mt-2 text-lg font-bold leading-snug text-neutral-900 group-hover:text-neutral-800">
                    {article.title}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-neutral-500">
                    {article.excerpt}
                  </p>
                  <span className="mt-4 text-sm font-semibold" style={{ color: IQ_GREEN }}>
                    Read & ask follow-up →
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
