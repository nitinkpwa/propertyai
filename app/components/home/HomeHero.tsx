"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BRAND } from "@/lib/brand";
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
    <section className="relative overflow-hidden pt-[100px]">
      <div className="mx-auto w-full max-w-7xl px-0 lg:px-8">
        <div className="relative min-h-[300px] overflow-hidden sm:min-h-[460px] lg:min-h-[580px] lg:rounded-2xl">
          <Image
            src={BRAND.assets.hero}
            alt={BRAND.alt.hero}
            fill
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1280px"
            className="object-cover object-center"
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(160deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.5) 100%)",
            }}
            aria-hidden
          />

          <div className="relative z-[2] mx-auto flex max-w-4xl flex-col items-center px-4 py-10 text-center sm:px-6 sm:py-14 lg:px-8 lg:py-16">
            <div className="w-full p-5 sm:p-8 lg:p-10" style={HERO_GLASS_STYLE}>
              <h1
                className="text-3xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl"
                style={{ textShadow: HERO_TEXT_SHADOW }}
              >
                Find the Right Property.
                <br />
                <span
                  style={{
                    color: "#000000",
                    textShadow: "0 1px 2px rgba(255,255,255,0.25)",
                  }}
                >
                  Not Just Any Property.
                </span>
              </h1>

              <p
                className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed sm:mt-5 sm:text-base lg:text-lg"
                style={{ color: "rgba(255,255,255,0.92)", textShadow: HERO_TEXT_SHADOW }}
              >
                Compare projects. Predict prices. Find the best investment. Understand builders.
                Book visits. Powered by Tech172 Intelligence.
              </p>

              <form
                className="mx-auto mt-6 max-w-2xl sm:mt-8"
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
                    className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-2xl px-6 text-sm font-bold text-white shadow-[0_4px_20px_rgba(74, 170, 39,0.4)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    style={{ backgroundColor: IQ_GREEN }}
                  >
                    Ask AreaIQ
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

              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row">
                <Link
                  href="/ask"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-8 text-sm font-bold text-white no-underline shadow-[0_4px_20px_rgba(74, 170, 39,0.4)] transition-transform hover:scale-[1.02] sm:w-auto"
                  style={{ backgroundColor: IQ_GREEN }}
                >
                  Start with AreaIQ
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
        </div>
      </div>
    </section>
  );
}
