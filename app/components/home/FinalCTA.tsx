"use client";

import Link from "next/link";
import { IQ_GREEN } from "./theme";

export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden border-t border-neutral-100 bg-[#F7F9FB] py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(74, 170, 39,0.08),transparent_70%)]" />
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-heading-primary sm:text-3xl md:text-4xl">
          Decide with intelligence
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted sm:text-base">
          Buyers ask AreaIQ. Sellers list for review. Connect Partners manage visits — one platform.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/ask"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-8 text-sm font-bold text-white no-underline shadow-[0_8px_32px_rgba(74, 170, 39,0.35)] transition-transform hover:scale-[1.02] sm:w-auto"
            style={{ backgroundColor: IQ_GREEN }}
          >
            Start with AreaIQ
          </Link>
          <Link
            href="/seller"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-neutral-200 bg-white px-8 text-sm font-semibold text-label no-underline hover:bg-neutral-50 sm:w-auto"
          >
            List Property
          </Link>
          <Link
            href="/connect"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-neutral-200 bg-white px-8 text-sm font-semibold text-label no-underline hover:bg-neutral-50 sm:w-auto"
          >
            AreaIQ Connect
          </Link>
        </div>
      </div>
    </section>
  );
}
