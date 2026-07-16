"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/common/Logo";
import { HERO_PLACEHOLDERS, HERO_SEARCH_CHIPS } from "@/lib/home/content";
import { HERO_GLASS_STYLE, HERO_TEXT_SHADOW, IQ_GREEN } from "./theme";

export default function HomeHero() {
  const router = useRouter();
  const [aiQuery, setAiQuery] = useState("");
  const placeholder = HERO_PLACEHOLDERS[0];

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
        style={{
          background:
            "linear-gradient(160deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.5) 100%)",
        }}
      />

      <div className="relative z-[2] mx-auto flex max-w-4xl flex-col items-center px-4 pb-20 pt-10 text-center sm:px-6 lg:px-8 lg:pb-24 lg:pt-16">
        <div
          className="mb-8 inline-flex rounded-[18px] border border-white/20 px-4 py-3.5 sm:mb-10 sm:px-5 sm:py-4"
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
        </div>

        <div className="w-full p-6 sm:p-10" style={HERO_GLASS_STYLE}>
          <h1
            className="text-3xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl"
            style={{ textShadow: HERO_TEXT_SHADOW }}
          >
            Find the Right Property.
            <br />
            <span style={{ color: IQ_GREEN }}>Not Just Any Property.</span>
          </h1>

          <p
            className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed sm:text-base lg:text-lg"
            style={{ color: "rgba(255,255,255,0.92)", textShadow: HERO_TEXT_SHADOW }}
          >
            Compare projects. Predict prices. Find the best investment. Understand builders.
            Book visits. All powered by AI.
          </p>

          <form
            className="mx-auto mt-8 max-w-2xl"
            onSubmit={(e) => {
              e.preventDefault();
              handleAiSearch();
            }}
          >
            <label htmlFor="home-ai-search" className="sr-only">
              Ask AreaIQ
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <input
                id="home-ai-search"
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder={placeholder}
                className="min-h-12 w-full flex-1 rounded-2xl border border-white/25 bg-white/95 px-4 py-3 text-sm text-heading-primary outline-none placeholder:text-muted focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/80 sm:text-[15px]"
              />
              <button
                type="submit"
                className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-2xl px-6 text-sm font-bold text-white shadow-[0_4px_20px_rgba(22,199,132,0.4)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: IQ_GREEN }}
              >
                Ask AI
              </button>
            </div>
          </form>

          <div className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
            {HERO_SEARCH_CHIPS.map((chip) => (
              <Link
                key={chip.id}
                href={chip.href}
                className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/95 no-underline backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                {chip.label}
              </Link>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/ask"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-8 text-sm font-bold text-white no-underline shadow-[0_4px_20px_rgba(22,199,132,0.4)] transition-transform hover:scale-[1.02] sm:w-auto"
              style={{ backgroundColor: IQ_GREEN }}
            >
              Start with AI
            </Link>
            <Link
              href="/properties"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/35 bg-white/10 px-8 text-sm font-semibold text-white no-underline backdrop-blur-sm transition-colors hover:bg-white/20 sm:w-auto"
            >
              Browse Properties
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
