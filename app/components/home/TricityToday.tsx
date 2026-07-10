"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import FadeIn from "./FadeIn";
import HorizontalCarousel from "./HorizontalCarousel";
import SectionHeader from "./SectionHeader";
import { TRICITY_TODAY } from "./data";
import { IQ_GREEN } from "./theme";

export default function TricityToday() {
  return (
    <section className="bg-[#F7F9FB] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="Tricity Today"
            title="Real-time AI Market Intelligence"
            action={{ label: "Full briefing", href: "/ask?q=Tricity+market+briefing+today" }}
          />
        </FadeIn>
        <HorizontalCarousel>
          {TRICITY_TODAY.map((item, i) => (
            <motion.div
              key={item.area}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              whileHover={{ y: -6 }}
              className="w-[min(100vw-2rem,300px)] shrink-0 snap-start sm:w-[280px]"
            >
              <Link
                href={item.href}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] no-underline transition-shadow hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)]"
              >
                <div className={`relative h-32 bg-gradient-to-br ${item.gradient} p-5`}>
                  <p className="text-lg font-bold text-heading-primary">{item.area}</p>
                  <p className="mt-1 text-2xl font-extrabold" style={{ color: IQ_GREEN }}>
                    {item.metric}
                  </p>
                  <p className="text-xs font-medium text-label">{item.metricLabel}</p>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="flex-1 text-sm leading-relaxed text-body">
                    {item.summary}
                  </p>
                  <span
                    className="mt-4 inline-flex items-center text-sm font-semibold transition-colors group-hover:opacity-80"
                    style={{ color: IQ_GREEN }}
                  >
                    Explore →
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </HorizontalCarousel>
      </div>
    </section>
  );
}