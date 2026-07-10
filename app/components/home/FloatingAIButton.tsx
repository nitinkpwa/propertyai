"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { IQ_GREEN } from "./theme";

export default function FloatingAIButton() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.2, duration: 0.4 }}
      className="fixed bottom-6 right-6 z-50 sm:bottom-8 sm:right-8"
    >
      <Link
        href="/ask"
        className="group flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_8px_32px_rgba(22,199,132,0.45)] transition-transform hover:scale-105 active:scale-95 sm:h-16 sm:w-16"
        style={{ backgroundColor: IQ_GREEN }}
        aria-label="Ask AreaIQ AI Assistant"
        title="Ask AreaIQ"
      >
        <span className="text-xl font-bold sm:text-2xl">✦</span>
        <span className="pointer-events-none absolute -top-10 right-0 hidden whitespace-nowrap rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 sm:block">
          Ask AreaIQ
        </span>
      </Link>
    </motion.div>
  );
}
