"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import FadeIn from "./FadeIn";
import HorizontalCarousel from "./HorizontalCarousel";
import SectionHeader from "./SectionHeader";
import { TRUSTED_BUILDERS } from "./data";
import { IQ_GREEN } from "./theme";

export default function TrustedBuildersCarousel() {
  return (
    <section className="bg-[#F7F9FB] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="Verified Partners"
            title="Trusted Builders"
            description="Explore Tricity developers — AI ratings available on request."
            action={{ label: "Compare builders", href: "/ask?q=Compare+top+builders+Tricity" }}
          />
        </FadeIn>
        <HorizontalCarousel>
          {TRUSTED_BUILDERS.map((builder, i) => (
            <motion.div
              key={builder.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -4 }}
              className="w-[min(100vw-2rem,260px)] shrink-0 snap-start sm:w-[240px]"
            >
              <Link
                href={builder.href}
                className="group block rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] no-underline transition-shadow hover:shadow-lg"
              >
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-md transition-transform group-hover:scale-105"
                  style={{ backgroundColor: IQ_GREEN }}
                >
                  {builder.initials}
                </div>
                <p className="mt-4 text-lg font-bold text-heading-primary">{builder.name}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-[#F7F9FB] px-2 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-label">
                      Projects
                    </p>
                    <p className="mt-1 text-sm font-semibold text-muted">Explore</p>
                  </div>
                  <div className="rounded-xl bg-[#F7F9FB] px-2 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-label">
                      Delivery
                    </p>
                    <p className="mt-1 text-sm font-semibold text-muted">—</p>
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-3 py-2.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                    AreaIQ Rating
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-emerald-600">Ask AreaIQ →</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </HorizontalCarousel>
      </div>
    </section>
  );
}
