"use client";

import { Bot, Handshake, ShieldCheck, type LucideIcon } from "lucide-react";
import { HERO_USP_ITEMS } from "@/lib/home/content";
import { IQ_GREEN } from "./theme";

const USP_ICONS: Record<string, LucideIcon> = {
  "ai-search": Bot,
  "direct-connect": Handshake,
  verified: ShieldCheck,
};

export default function HeroUsps() {
  return (
    <div className="mx-auto mt-5 w-full max-w-3xl sm:mt-6" aria-label="Why Choose AreaIQ">
      <p className="mb-2.5 text-center text-[13px] font-semibold tracking-[0.12em] text-white/85 sm:mb-3 sm:text-[11px] sm:uppercase sm:tracking-[0.16em] sm:text-white/75">
        <span className="sm:hidden">✨ Why Choose AreaIQ?</span>
        <span className="hidden sm:inline">Why AreaIQ?</span>
      </p>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
        {HERO_USP_ITEMS.map((item) => {
          const Icon = USP_ICONS[item.id] ?? Bot;
          return (
            <li key={item.id}>
              <article
                className="group h-full rounded-2xl border border-white/20 bg-white/10 p-3 text-left backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/16 hover:shadow-[0_8px_28px_rgba(0,0,0,0.18)] sm:p-4"
              >
                <div
                  className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg shadow-[0_2px_10px_rgba(74,170,39,0.35)] transition-transform group-hover:scale-105 sm:mb-2.5 sm:h-9 sm:w-9 sm:rounded-xl"
                  style={{ backgroundColor: IQ_GREEN }}
                >
                  <Icon className="h-4 w-4 text-white sm:h-[18px] sm:w-[18px]" strokeWidth={2} aria-hidden />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200/95">
                  {item.eyebrow}
                </p>
                <h3 className="mt-1 text-[13px] font-semibold leading-snug text-white sm:text-sm">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/78 sm:text-xs">
                  {item.description}
                </p>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
