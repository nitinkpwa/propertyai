"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import FadeIn from "./FadeIn";
import { IQ_GREEN } from "./theme";

export default function SellerCTA() {
  return (
    <section className="px-4 pb-8 sm:px-6 lg:px-8">
      <FadeIn>
        <motion.div
          whileHover={{ scale: 1.005 }}
          className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-neutral-200/80 bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.06)] sm:p-12 lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:gap-8"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-100/50 blur-3xl" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              List with intelligence, not guesswork
            </h2>
            <p className="mt-3 max-w-lg text-neutral-500">
              Reach verified buyers. Get inquiries on WhatsApp. AreaIQ surfaces your listings to
              the right audience.
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:flex-col">
            <Link
              href="/seller"
              className="inline-flex items-center justify-center rounded-xl px-8 py-3.5 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: IQ_GREEN }}
            >
              List Property Free →
            </Link>
            <Link
              href="/ask?q=How+to+get+best+price+for+my+property+Tricity"
              className="inline-flex items-center justify-center rounded-xl border border-neutral-200 px-8 py-3.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-[#F7F9FB]"
            >
              Get AI Price Estimate
            </Link>
          </div>
        </motion.div>
      </FadeIn>
    </section>
  );
}
