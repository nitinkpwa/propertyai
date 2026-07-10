"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SMART_CHIPS } from "./data";
import { HERO_GLASS_STYLE } from "./theme";

type SmartChipsProps = {
  className?: string;
  variant?: "default" | "hero";
};

export default function SmartChips({ className = "", variant = "default" }: SmartChipsProps) {
  const isHero = variant === "hero";

  return (
    <div className={`flex flex-wrap gap-2.5 sm:gap-3 ${className}`}>
      {SMART_CHIPS.map((chip, i) => (
        <motion.div
          key={chip.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + i * 0.03, duration: 0.4 }}
          whileHover={{ y: -2, scale: 1.02 }}
        >
          <Link
            href={chip.href}
            className={
              isHero
                ? "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium text-white/85 no-underline opacity-80 transition-all hover:opacity-100 sm:text-sm"
                : "inline-flex items-center gap-2 rounded-full border border-neutral-200/80 bg-white/90 px-3.5 py-2 text-xs font-medium text-body no-underline shadow-sm backdrop-blur-sm transition-shadow hover:border-emerald-200 hover:shadow-md sm:text-sm"
            }
            style={
              isHero
                ? {
                    ...HERO_GLASS_STYLE,
                    borderRadius: "9999px",
                    padding: "8px 14px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  }
                : undefined
            }
          >
            <span>{chip.icon}</span>
            {chip.label}
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
