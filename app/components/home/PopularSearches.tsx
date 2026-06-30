"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import FadeIn from "./FadeIn";
import { POPULAR_SEARCHES } from "./data";

export default function PopularSearches() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            Popular searches in Tricity
          </h2>
        </FadeIn>
        <div className="mt-8 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {POPULAR_SEARCHES.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -2 }}
            >
              <Link
                href={s.href}
                className="flex items-center gap-3 rounded-2xl border border-neutral-200/80 bg-[#F7F9FB] px-4 py-3.5 text-sm font-medium text-neutral-700 no-underline transition-all hover:border-emerald-200 hover:bg-white hover:shadow-sm"
              >
                <span className="font-bold text-[#16C784]">→</span>
                {s.label}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
