"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, TrendingUp } from "lucide-react";
import type { TrendingLocationCard } from "@/lib/home/terminalTypes";
import { formatInrAmount } from "@/lib/properties/pricingDisplay";
import { IQ_GREEN } from "../theme";
import { SkeletonBlock, TerminalSectionHeader } from "./primitives";
import { useTerminalData } from "./useTerminalData";

export default function TrendingLocations() {
  const { loading, bundle } = useTerminalData();
  const cards = bundle?.trending ?? [];

  return (
    <div>
      <TerminalSectionHeader
        eyebrow="Trending"
        title="Hot locations"
        action={{ label: "Explore", href: "/properties" }}
      />
      {loading && cards.length === 0 ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-64 w-[280px] shrink-0" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-[#F7F9FB] px-4 py-10 text-center text-sm text-muted">
          No trending zones yet —{" "}
          <Link href="/ask" className="font-semibold text-[#4AAA27] no-underline">
            Ask AreaIQ
          </Link>
        </div>
      ) : (
        <div
          className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 snap-x snap-mandatory sm:mx-0 sm:px-0"
          style={{ scrollbarWidth: "thin" }}
        >
          {cards.map((card: TrendingLocationCard) => (
            <motion.div
              key={card.id}
              whileHover={{ y: -4 }}
              className="w-[min(300px,85vw)] shrink-0 snap-start"
            >
              <Link
                href={card.href}
                className="group relative block overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-900 no-underline shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
              >
                <div className="relative aspect-[5/4]">
                  {card.imageUrl ? (
                    <Image
                      src={card.imageUrl}
                      alt={card.name}
                      fill
                      sizes="300px"
                      className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-neutral-700 via-neutral-600 to-emerald-800" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-white/80">
                      <MapPin className="h-3.5 w-3.5" aria-hidden />
                      {card.name}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-white/60">
                          Score
                        </p>
                        <p className="font-bold tabular-nums">{card.score ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-white/60">
                          Growth
                        </p>
                        <p className="inline-flex items-center gap-1 font-bold tabular-nums">
                          <TrendingUp
                            className="h-3.5 w-3.5"
                            style={{ color: IQ_GREEN }}
                            aria-hidden
                          />
                          {card.growth ?? "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-white/60">
                          Avg price
                        </p>
                        <p className="font-bold tabular-nums">
                          {card.averagePrice != null
                            ? formatInrAmount(card.averagePrice)
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-white/60">
                          Verified
                        </p>
                        <p className="font-bold tabular-nums">
                          {card.verifiedProjects}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
