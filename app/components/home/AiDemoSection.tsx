"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import FadeIn from "./FadeIn";
import { IQ_GREEN } from "./theme";

export default function AiDemoSection() {
  return (
    <section className="border-y border-neutral-100 bg-white py-16 sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <FadeIn>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#4AAA27]">
            AI That Actually Helps
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-heading-primary sm:text-3xl">
            Real estate advice in your language
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            Hindi, English, or Hinglish — AreaIQ understands how Tricity buyers actually search
            and invest.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Investment analysis & rental yield",
              "Area comparison with pros and risks",
              "Infrastructure impact on prices",
              "Budget-wise picks from verified listings",
            ].map((item) => (
              <li key={item} className="flex gap-3 text-sm text-body">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: IQ_GREEN }}
                >
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/ask"
            className="mt-8 inline-flex rounded-xl px-6 py-3.5 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: IQ_GREEN }}
          >
            Try AreaIQ Intelligence →
          </Link>
        </FadeIn>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.06)]"
        >
          <div className="flex items-center gap-3 border-b border-neutral-100 bg-[#F7F9FB] px-5 py-3.5">
            <div className="flex gap-1.5">
              {["#FF5F57", "#FFBD2E", "#28CA42"].map((c) => (
                <div key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
              ))}
            </div>
            <span className="text-sm text-muted">AreaIQ Intelligence</span>
          </div>
          <div className="space-y-4 p-5">
            <div className="flex justify-end">
              <div
                className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 text-sm text-white"
                style={{ backgroundColor: IQ_GREEN }}
              >
                Mere paas ₹60 lakh hai. Investment ke liye best area?
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm">
                ✦
              </div>
              <div className="rounded-2xl rounded-bl-md bg-[#F7F9FB] px-4 py-3 text-sm leading-relaxed text-heading-secondary">
                ₹60L ke liye Phase 8B Mohali, New Chandigarh plots, ya SCO Kharar bypass —
                teen strong options with different risk profiles.
              </div>
            </div>
          </div>
          <div className="border-t border-neutral-100 p-4">
            <Link
              href="/ask"
              className="block rounded-xl bg-neutral-900 py-3 text-center text-sm font-semibold text-white no-underline hover:bg-neutral-800"
            >
              Start your conversation →
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
