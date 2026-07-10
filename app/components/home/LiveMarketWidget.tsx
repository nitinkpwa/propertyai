"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import AnimatedCounter from "./AnimatedCounter";
import { LIVE_ACTIVITY } from "./data";
import { HERO_GLASS_STYLE, HERO_TEXT_SHADOW, IQ_GREEN } from "./theme";

type LiveMarketWidgetProps = {
  className?: string;
  variant?: "default" | "hero";
};

export default function LiveMarketWidget({
  className = "",
  variant = "default",
}: LiveMarketWidgetProps) {
  const isHero = variant === "hero";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`p-5 sm:p-6 ${className}`}
      style={
        isHero
          ? { ...HERO_GLASS_STYLE, padding: "24px 28px" }
          : {
              borderRadius: "16px",
              border: "1px solid rgba(0,0,0,0.06)",
              background: "rgba(255,255,255,0.75)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
            }
      }
    >
      <div className="mb-4 flex items-center justify-between">
        <p
          className={`text-sm font-semibold ${isHero ? "text-white" : "text-heading-primary"}`}
          style={isHero ? { textShadow: HERO_TEXT_SHADOW } : undefined}
        >
          Live Market Activity
        </p>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
            isHero
              ? "border border-white/20 bg-white/10 text-white/90"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ backgroundColor: IQ_GREEN }}
            />
            <span
              className="relative inline-flex h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: IQ_GREEN }}
            />
          </span>
          Live
        </span>
      </div>
      <ul className="space-y-3">
        {LIVE_ACTIVITY.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className={`group flex items-center justify-between rounded-xl px-2 py-1.5 no-underline transition-colors ${
                isHero ? "hover:bg-white/10" : "hover:bg-[#F7F9FB]"
              }`}
            >
              <span
                className={`text-sm ${
                  isHero
                    ? "text-white/80 group-hover:text-white"
                    : "text-body group-hover:text-heading-primary"
                }`}
                style={isHero ? { textShadow: "0 1px 6px rgba(0,0,0,0.3)" } : undefined}
              >
                {item.label}
              </span>
              <span
                className={`text-lg font-bold tabular-nums ${
                  isHero ? "text-white" : "text-heading-primary"
                }`}
                style={isHero ? { textShadow: HERO_TEXT_SHADOW } : undefined}
              >
                {typeof item.value === "number" ? (
                  <AnimatedCounter value={item.value} />
                ) : (
                  item.value
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
