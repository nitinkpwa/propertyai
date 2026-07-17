"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FadeIn from "../FadeIn";
import SectionHeader from "../SectionHeader";
import { BUYER_JOURNEY } from "../data";
import { IQ_GREEN } from "../theme";

export default function BuyerJourneySection() {
  const [active, setActive] = useState(0);
  const step = BUYER_JOURNEY[active];

  return (
    <section className="bg-neutral-900 py-16 text-white sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            variant="dark"
            eyebrow="Buyer Journey"
            title="From Confusion to Confident Purchase"
            description="AreaIQ guides you at every step — not just at search."
          />
        </FadeIn>

        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <div className="space-y-1">
            {BUYER_JOURNEY.map((s, i) => (
              <button
                key={s.step}
                type="button"
                onClick={() => setActive(i)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-all ${
                  active === i ? "bg-white/10 font-semibold text-white" : "text-white/60 hover:bg-white/5 hover:text-white/90"
                }`}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                  style={active === i ? { backgroundColor: IQ_GREEN, color: "#fff" } : { backgroundColor: "rgba(255,255,255,0.08)" }}
                >
                  {s.step}
                </span>
                <span className="truncate">{s.title}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step.step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm"
            >
              <span className="text-3xl">{step.icon}</span>
              <p className="text-shadow-brand mt-4 text-xs font-bold uppercase tracking-widest text-emerald-400">
                Step {step.step} of {BUYER_JOURNEY.length}
              </p>
              <h3 className="text-shadow-photo mt-2 text-2xl font-bold">{step.title}</h3>
              <p className="mt-3 max-w-lg leading-relaxed text-white/70">{step.desc}</p>
              <Link
                href={step.href}
                className="mt-8 inline-flex rounded-xl px-6 py-3 text-sm font-bold text-white no-underline transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: IQ_GREEN }}
              >
                Continue →
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
