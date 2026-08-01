"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Search } from "lucide-react";
import { BRAND } from "@/lib/brand";
import AnimatedCounter from "../AnimatedCounter";
import { HERO_GLASS_STYLE, HERO_TEXT_SHADOW, IQ_GREEN } from "../theme";
import { useTerminalData } from "./useTerminalData";
import { SkeletonBlock } from "./primitives";

export default function TerminalHero() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { loading, bundle } = useTerminalData();
  const [query, setQuery] = useState("");
  const stats = bundle?.heroStats ?? [];

  const submit = (q?: string) => {
    const next = (q ?? query).trim();
    if (!next) {
      router.push("/ask");
      return;
    }
    router.push(`/ask?q=${encodeURIComponent(next)}`);
  };

  return (
    <section className="relative overflow-hidden pt-layout">
      <div className="mx-auto w-full max-w-7xl px-0 lg:px-8">
        <div className="relative min-h-[420px] overflow-hidden sm:min-h-[560px] lg:min-h-[640px] lg:rounded-2xl">
          <motion.div
            className="absolute inset-0"
            animate={
              reduce
                ? undefined
                : { scale: [1, 1.04, 1], x: [0, -8, 0], y: [0, 4, 0] }
            }
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          >
            <Image
              src={BRAND.assets.hero}
              alt={BRAND.alt.hero}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1280px"
              className="object-cover object-center"
            />
          </motion.div>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(165deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.58) 100%)",
            }}
            aria-hidden
          />

          <div className="relative z-[2] mx-auto flex max-w-4xl flex-col items-center px-4 py-8 text-center sm:px-6 sm:py-14 lg:py-16">
            <div
              className="flex w-full flex-col items-center px-4 py-5 sm:p-8 lg:p-10"
              style={HERO_GLASS_STYLE}
            >
              <p
                className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80"
                style={{ textShadow: HERO_TEXT_SHADOW }}
              >
                AreaIQ Terminal
              </p>
              <h1
                className="mt-2 text-[2.25rem] font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl"
                style={{ textShadow: HERO_TEXT_SHADOW }}
              >
                See the market.
              </h1>

              <form
                className="mx-auto mt-6 w-full max-w-2xl sm:mt-8"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <label htmlFor="terminal-ai-search" className="sr-only">
                  Search AreaIQ
                </label>
                <div className="flex items-stretch gap-2 rounded-2xl border border-white/25 bg-white p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.18)] sm:gap-3 sm:p-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2 px-2 sm:px-3">
                    <Search className="h-5 w-5 shrink-0 text-neutral-400" aria-hidden />
                    <input
                      id="terminal-ai-search"
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Where, budget, goal…"
                      className="min-h-11 w-full border-0 bg-transparent text-sm text-heading-primary outline-none placeholder:text-muted sm:min-h-12 sm:text-[15px]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl px-5 text-sm font-bold text-white sm:min-h-12 sm:px-7"
                    style={{ backgroundColor: IQ_GREEN }}
                  >
                    Search
                  </button>
                </div>
              </form>

              <div className="mt-6 grid w-full max-w-2xl grid-cols-3 gap-2 sm:mt-8 sm:grid-cols-5 sm:gap-3">
                {loading && stats.length === 0
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <SkeletonBlock key={i} className="h-16 bg-white/15" />
                    ))
                  : stats.map((stat) => (
                      <Link
                        key={stat.id}
                        href={stat.href}
                        className="rounded-xl border border-white/20 bg-white/10 px-2 py-2.5 no-underline backdrop-blur-md transition-colors hover:bg-white/18 sm:px-3"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">
                          {stat.label}
                        </p>
                        <p
                          className="mt-1 text-lg font-bold tabular-nums text-white sm:text-xl"
                          style={{ textShadow: HERO_TEXT_SHADOW }}
                        >
                          {stat.id === "avg-price" ? (
                            stat.display ?? "—"
                          ) : stat.value != null ? (
                            <AnimatedCounter value={stat.value} />
                          ) : (
                            "—"
                          )}
                        </p>
                      </Link>
                    ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
