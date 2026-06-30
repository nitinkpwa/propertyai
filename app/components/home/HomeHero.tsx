"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/common/Logo";
import LiveMarketWidget from "./LiveMarketWidget";
import SmartChips from "./SmartChips";
import {
  AI_EXAMPLE_PROMPTS,
  BUDGETS,
  LOCATIONS,
} from "./data";
import { HERO_GLASS_STYLE, HERO_TEXT_SHADOW, IQ_GREEN } from "./theme";

const PROPERTY_TYPES = ["Buy", "Rent", "Commercial"] as const;

const FLOATING_LOCATIONS = [
  { label: "Aerocity", style: { top: "20%", right: "6%" } },
  { label: "Mohali", style: { top: "44%", right: "12%" } },
  { label: "Zirakpur", style: { bottom: "22%", right: "4%" } },
  { label: "PR7", style: { top: "32%", right: "22%" } },
] as const;

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3-3" strokeLinecap="round" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" strokeLinecap="round" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" strokeLinejoin="round" />
      <path d="M8 2v16M16 6v16" />
    </svg>
  );
}

export default function HomeHero() {
  const router = useRouter();
  const [aiQuery, setAiQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof PROPERTY_TYPES)[number]>("Buy");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedBudget, setSelectedBudget] = useState("");

  const handleAiSearch = (query?: string) => {
    const q = (query ?? aiQuery).trim();
    if (!q) return;
    router.push(`/ask?q=${encodeURIComponent(q)}`);
  };

  const handleFilterSearch = () => {
    const params = new URLSearchParams();
    if (activeTab === "Buy") params.set("type", "buy");
    else if (activeTab === "Rent") params.set("type", "rent");
    else params.set("type", "commercial");
    if (selectedCity) params.set("city", selectedCity);
    if (selectedBudget) {
      const budget = BUDGETS.find((b) => b.label === selectedBudget);
      if (budget) {
        params.set("min", budget.min.toString());
        params.set("max", budget.max.toString());
      }
    }
    router.push(`/properties?${params.toString()}`);
  };

  return (
    <section className="relative min-h-[100svh] overflow-hidden pt-[100px]">
      {/* Full vibrant background image — unchanged */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/hero-banner.png")' }}
      />

      {/* Subtle readability gradient — max 15% black, no green tint */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.05))",
        }}
      />

      {/* Floating location cards — outside glass panel, subdued */}
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
            style={{
              ...HERO_GLASS_STYLE,
              padding: "8px 16px",
              borderRadius: "16px",
            }}
          >
            📍 {loc.label}
          </div>
        </motion.div>
      ))}

      <div className="relative z-[2] mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-12 lg:px-8 lg:pb-20 lg:pt-12">
        {/* Left — brand mark + glass content panel */}
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
            className="p-10 sm:p-12 lg:p-[50px]"
            style={HERO_GLASS_STYLE}
          >
            <h1
              className="text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl"
              style={{ textShadow: HERO_TEXT_SHADOW }}
            >
              Know Before
              <br />
              You Buy.
              <br />
              <span style={{ color: IQ_GREEN, textShadow: HERO_TEXT_SHADOW }}>Not After.</span>
            </h1>

            <p
              className="mt-8 max-w-xl text-base leading-relaxed sm:text-lg lg:mt-10"
              style={{ color: "rgba(255,255,255,0.95)", textShadow: HERO_TEXT_SHADOW }}
            >
              AreaIQ helps you discover, compare and invest using AI-powered real estate
              intelligence across Tricity.
            </p>

            {/* AI search — inside glass panel */}
            <div className="mt-10 lg:mt-12">
              <div
                className="rounded-2xl border border-white/20 p-4 sm:p-5"
                style={{ background: "rgba(255,255,255,0.14)" }}
              >
                <div className="flex items-start gap-3">
                  <textarea
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAiSearch();
                      }
                    }}
                    rows={2}
                    placeholder="Ask AreaIQ anything..."
                    className="min-h-[56px] flex-1 resize-none border-none bg-transparent text-[15px] text-white outline-none placeholder:text-white/55"
                    style={{ textShadow: "0 1px 4px rgba(0,0,0,0.25)" }}
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-4">
                  <div className="flex flex-wrap gap-1">
                    {[
                      { icon: <SearchIcon />, label: "Search", action: () => handleAiSearch() },
                      { icon: <MicIcon />, label: "Voice", action: () => router.push("/ask") },
                      { icon: <span className="text-sm">📎</span>, label: "Attach", action: () => router.push("/ask") },
                      { icon: <MapIcon />, label: "Map", action: () => router.push("/properties?type=buy") },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={btn.action}
                        title={btn.label}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-white/70 transition-all hover:scale-105 hover:bg-white/10 hover:text-white"
                      >
                        {btn.icon}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowFilters((s) => !s)}
                      className="rounded-xl px-3 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white"
                    >
                      {showFilters ? "Hide filters" : "Browse listings"}
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

                {showFilters ? (
                  <div
                    className="mt-4 space-y-3 rounded-xl border border-white/15 p-3"
                    style={{ background: "rgba(255,255,255,0.1)" }}
                  >
                    <div className="flex flex-wrap gap-2">
                      {PROPERTY_TYPES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setActiveTab(t)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                            activeTab === t
                              ? "text-white"
                              : "bg-white/10 text-white/80 hover:bg-white/15"
                          }`}
                          style={activeTab === t ? { backgroundColor: IQ_GREEN } : undefined}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <select
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        className="flex-1 rounded-lg border border-white/20 bg-white/15 px-3 py-2 text-sm text-white outline-none [&>option]:text-neutral-900"
                      >
                        <option value="">Location</option>
                        {LOCATIONS.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                      <select
                        value={selectedBudget}
                        onChange={(e) => setSelectedBudget(e.target.value)}
                        className="flex-1 rounded-lg border border-white/20 bg-white/15 px-3 py-2 text-sm text-white outline-none [&>option]:text-neutral-900"
                      >
                        <option value="">Budget</option>
                        {BUDGETS.map((b) => (
                          <option key={b.label} value={b.label}>{b.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleFilterSearch}
                        className="rounded-lg px-4 py-2 text-sm font-bold text-white"
                        style={{ backgroundColor: IQ_GREEN }}
                      >
                        Search
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  {AI_EXAMPLE_PROMPTS.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => {
                        setAiQuery(ex);
                        handleAiSearch(ex);
                      }}
                      className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white/75 opacity-75 transition-all hover:opacity-100 hover:border-white/35 hover:bg-white/10"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                    >
                      &quot;{ex}&quot;
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Smart chips — outside glass panel */}
          <SmartChips className="mt-10 opacity-85 lg:mt-12" variant="hero" />
        </div>

        {/* Right — live widget (desktop) */}
        <div className="hidden lg:block">
          <LiveMarketWidget variant="hero" />
        </div>
      </div>

      {/* Mobile live widget */}
      <div className="relative z-[2] mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:hidden">
        <LiveMarketWidget variant="hero" />
      </div>
    </section>
  );
}
