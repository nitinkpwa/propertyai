"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";
import { HERO_PLACEHOLDERS, HERO_SEARCH_CHIPS } from "@/lib/home/content";
import HeroUsps from "./HeroUsps";
import { HERO_GLASS_STYLE, HERO_TEXT_SHADOW, IQ_GREEN } from "./theme";

const MOBILE_HERO_PLACEHOLDER = "Describe your dream property...";

export default function HomeHero() {
  const router = useRouter();
  const [aiQuery, setAiQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const placeholder = isMobile ? MOBILE_HERO_PLACEHOLDER : HERO_PLACEHOLDERS[0];

  const handleAiSearch = (query?: string) => {
    const q = (query ?? aiQuery).trim();
    if (!q) {
      router.push("/ask");
      return;
    }
    router.push(`/ask?q=${encodeURIComponent(q)}`);
  };

  return (
    <section className="relative overflow-hidden pt-layout">
      <div className="mx-auto w-full max-w-7xl px-0 lg:px-8">
        <div className="relative min-h-[300px] overflow-hidden sm:min-h-[520px] lg:min-h-[640px] lg:rounded-2xl">
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
                "linear-gradient(160deg, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.42) 45%, rgba(0,0,0,0.55) 100%)",
            }}
            aria-hidden
          />

          <div className="relative z-[2] mx-auto flex max-w-4xl flex-col items-center px-4 py-5 text-center sm:px-6 sm:py-14 lg:px-8 lg:py-16">
            <div className="flex w-full flex-col items-center px-3.5 py-3 sm:items-stretch sm:p-8 lg:p-10" style={HERO_GLASS_STYLE}>
              <h1
                className="w-[92%] text-center text-[2.375rem] font-bold leading-[1.08] tracking-tight text-balance text-white sm:w-full sm:text-5xl sm:leading-[1.08] lg:text-6xl"
                style={{ textShadow: HERO_TEXT_SHADOW }}
              >
                Find the Right Property.
                <br className="hidden sm:block" />
                <span className="sm:hidden"> </span>
                <span
                  style={{
                    color: "#000000",
                    textShadow: "0 1px 2px rgba(255,255,255,0.25)",
                  }}
                >
                  Not Just Any Property.
                </span>
              </h1>

              {/* Mobile: natural wrap. Desktop: original supporting copy. */}
              <p
                className="mt-2 w-[92%] text-center text-[15px] leading-[1.45] text-pretty sm:hidden"
                style={{ color: "rgba(255,255,255,0.92)", textShadow: HERO_TEXT_SHADOW }}
              >
                Compare projects. Predict prices. Connect directly with verified builders &amp;
                sellers.
              </p>
              <p
                className="mx-auto mt-5 hidden max-w-2xl text-base leading-relaxed sm:block lg:text-lg"
                style={{ color: "rgba(255,255,255,0.92)", textShadow: HERO_TEXT_SHADOW }}
              >
                Compare projects. Predict prices. Find the best investment. Understand builders.
                Book visits. Powered by Tech172 Intelligence.
              </p>

              <form
                className="mx-auto mt-4 w-full max-w-2xl sm:mt-8"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAiSearch();
                }}
              >
                <label htmlFor="home-ai-search" className="sr-only">
                  Ask AreaIQ
                </label>
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-stretch sm:gap-3">
                  <input
                    id="home-ai-search"
                    type="text"
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    placeholder={placeholder}
                    className="min-h-11 w-full flex-1 rounded-2xl border border-white/25 bg-white/95 px-4 py-2.5 text-sm text-heading-primary outline-none placeholder:text-muted focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/80 sm:min-h-12 sm:py-3 sm:text-[15px]"
                  />
                  <button
                    type="submit"
                    className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-2xl px-8 text-sm font-bold text-white shadow-[0_4px_20px_rgba(74, 170, 39,0.4)] transition-transform hover:scale-[1.02] active:scale-[0.98] sm:min-h-12 sm:w-auto sm:px-6"
                    style={{ backgroundColor: IQ_GREEN }}
                  >
                    Ask AreaIQ
                  </button>
                </div>
              </form>

              <HeroUsps />

              <div className="mx-auto mt-4 flex max-w-2xl flex-wrap justify-center gap-2 sm:mt-5">
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

              <div className="mt-4 flex flex-col items-center justify-center gap-2.5 sm:mt-8 sm:flex-row sm:gap-3">
                <Link
                  href="/ask"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl px-8 text-sm font-bold text-white no-underline shadow-[0_4px_20px_rgba(74, 170, 39,0.4)] transition-transform hover:scale-[1.02] sm:min-h-12 sm:w-auto"
                  style={{ backgroundColor: IQ_GREEN }}
                >
                  Start with AreaIQ
                </Link>
                <Link
                  href="/properties"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-white/35 bg-white/10 px-8 text-sm font-semibold text-white no-underline backdrop-blur-sm transition-colors hover:bg-white/20 sm:min-h-12 sm:w-auto"
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
