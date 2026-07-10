"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { IQ_GREEN } from "./theme";

export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-white py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(22,199,132,0.08),transparent_70%)]" />
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl font-bold tracking-tight text-heading-primary sm:text-4xl md:text-5xl"
        >
          Ready to Find Your Next Property?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.08 }}
          className="mx-auto mt-4 max-w-lg text-muted"
        >
          Start a conversation with AreaIQ — compare areas, evaluate builders, and discover
          listings tailored to your goals.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="mt-10"
        >
          <Link
            href="/ask"
            className="inline-flex items-center justify-center rounded-2xl px-10 py-4 text-base font-bold text-white shadow-[0_8px_32px_rgba(22,199,132,0.35)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: IQ_GREEN }}
          >
            Start Talking to AreaIQ
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
