"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/common/Logo";
import LiveMarketWidget from "./LiveMarketWidget";
import SmartChips from "./SmartChips";
import { AI_EXAMPLE_PROMPTS, HERO_CAPABILITIES } from "./data";
import { HERO_GLASS_STYLE, HERO_TEXT_SHADOW, IQ_GREEN } from "./theme";

const FLOATING_LOCATIONS = [
  { label: "Aerocity", style: { top: "20%", right: "6%" } },
  { label: "Mohali", style: { top: "44%", right: "12%" } },
  { label: "Zirakpur", style: { bottom: "22%", right: "4%" } },
  { label: "PR7", style: { top: "32%", right: "22%" } },
] as const;

const HERO_PLACEHOLDER =
  "I'm looking for a 3BHK under ₹90 lakh near IT City Mohali with good rental yield and reputed builder.";

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" strokeLinecap="round" />
    </svg>
  );
}

export default function HomeHero() {
  const router = useRouter();
  const [aiQuery, setAiQuery] = useState("");

  const handleAiSearch = (query?: string) => {
    const q = (query ?? aiQuery).trim();
    if (!q) {
      router.push("/ask");
      return;
    }
    router.push(`/ask?q=${encodeURIComponent(q)}`);
  };

  return (
    <section className="relative min-h-[100svh] overflow-hidden pt-[100px]">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/hero-banner.png")' }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.05))" }}
      />

      {FLOATING_LOCATIONS.map((loc, i) => (
        <motion.div
          key={loc.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.08, duration: 0.5 }}
          className="pointer-events-none absolute z-[1] hidden lg:block"
          style={loc.style}
        >
          <div
            className="rounded-2xl px-4 py-2 text-xs font-semibold text-white/80 opacity-60"
            style={{ ...HERO_GLASS_STYLE, padding: "8px 16px", borderRadius: "16px" }}
          >
            📍 {loc.label}
          </div>
        </motion.div>
      ))}

      <div className="relative z-[2] mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-12 lg:px-8 lg:pb-20 lg:pt-12">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6 inline-flex rounded-[18px] border border-white/20 px-4 py-3.5 sm:mb-8 sm:px-5 sm:py-4"
            style={{
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              boxShadow: "0 4px 28px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            <Logo
              href="/"
              size="hero"
              showTagline
              variant="light"
              accentColor={IQ_GREEN}
              lightAccentColor={IQ_GREEN}
              priority
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="p-8 sm:p-10 lg:p-12"
            style={HERO_GLASS_STYLE}
          >
            <h1
              className="text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl"
              style={{ textShadow: HERO_TEXT_SHADOW }}
            >
              Know Before You Buy.
              <br />
              <span style={{ color: IQ_GREEN, textShadow: HERO_TEXT_SHADOW }}>Not After.</span>
            </h1>

            <p
              className="mt-6 max-w-xl text-base leading-relaxed sm:text-lg"
              style={{ color: "rgba(255,255,255,0.95)", textShadow: HERO_TEXT_SHADOW }}
            >
              India&apos;s AI-powered Real Estate Intelligence Platform for Tricity.
            </p>
            <p
              className="mt-3 max-w-xl text-sm leading-relaxed sm:text-base"
              style={{ color: "rgba(255,255,255,0.85)", textShadow: HERO_TEXT_SHADOW }}
            >
              Instead of searching listings, describe your requirements naturally. AreaIQ will:
            </p>
            <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
              {HERO_CAPABILITIES.map((cap) => (
                <li
                  key={cap}
                  className="flex items-center gap-2 text-sm text-white/90"
                  style={{ textShadow: HERO_TEXT_SHADOW }}
                >
                  <span style={{ color: IQ_GREEN }}>•</span>
                  {cap}
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <div
                className="rounded-2xl border border-white/20 p-4 sm:p-5"
                style={{ background: "rgba(255,255,255,0.14)" }}
              >
                <textarea
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAiSearch();
                    }
                  }}
                  rows={3}
                  placeholder={HERO_PLACEHOLDER}
                  className="min-h-[72px] w-full resize-none border-none bg-transparent text-[15px] leading-relaxed text-white outline-none placeholder:text-white/50"
                />

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => router.push("/ask")}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-xs font-medium text-white/85 transition-all hover:bg-white/10"
                    >
                      <MicIcon /> Voice
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/ask")}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-xs font-medium text-white/85 transition-all hover:bg-white/10"
                    >
                      📎 Attach Requirement
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAiSearch()}
                    className="inline-flex items-center justify-center rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_24px_rgba(22,199,132,0.45)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
                    style={{ backgroundColor: IQ_GREEN }}
                  >
                    Ask AreaIQ
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          <SmartChips className="mt-8 lg:mt-10" variant="hero" />

          <div className="mt-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-white/60">
              Popular AI Questions
            </p>
            <div className="flex flex-wrap gap-2">
              {AI_EXAMPLE_PROMPTS.slice(0, 8).map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => handleAiSearch(ex)}
                  className="rounded-full border border-white/20 px-3 py-1.5 text-left text-xs font-medium text-white/75 transition-all hover:border-white/35 hover:bg-white/10 hover:text-white"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  {ex.length > 48 ? `${ex.slice(0, 48)}…` : ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden lg:block">
          <LiveMarketWidget variant="hero" />
        </div>
      </div>

      <div className="relative z-[2] mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:hidden">
        <LiveMarketWidget variant="hero" />
      </div>
    </section>
  );
}
