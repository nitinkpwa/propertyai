import Link from "next/link";
import { EMERALD } from "./shared";

export default function BottomCTA() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-neutral-200/80 bg-gradient-to-br from-neutral-900 via-neutral-900 to-emerald-950 p-8 shadow-[0_8px_40px_rgba(0,0,0,0.15)] sm:p-12 lg:p-16">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
          Need Expert Advice?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400 sm:text-base">
          Get personalized investment insights, compare projects, and make confident decisions with AreaIQ AI.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link
            href="/ask"
            className="inline-flex w-full items-center justify-center rounded-xl px-8 py-3.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(34,197,94,0.35)] transition-all hover:shadow-[0_4px_14px_rgba(34,197,94,0.45)] hover:brightness-105 active:scale-[0.98] sm:w-auto"
            style={{ backgroundColor: EMERALD }}
          >
            Talk to AI
          </Link>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center rounded-xl border border-white/20 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/15 active:scale-[0.98] sm:w-auto"
          >
            Schedule Visit
          </button>
        </div>
      </div>
    </section>
  );
}
