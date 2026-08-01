"use client";

import Link from "next/link";
import type { BuilderLeaderboardRow } from "@/lib/home/terminalTypes";
import { ProgressBar, SkeletonBlock, TerminalSectionHeader } from "./primitives";
import { useTerminalData } from "./useTerminalData";
import { IQ_GREEN } from "../theme";

export default function BuilderLeaderboard() {
  const { loading, bundle } = useTerminalData();
  const rows = bundle?.builders ?? [];

  return (
    <div>
      <TerminalSectionHeader
        eyebrow="Builders"
        title="Leaderboard"
        action={{ label: "All builders", href: "/ask?q=Top+builders+Tricity" }}
      />
      {loading && rows.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-14" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-8 text-center text-sm text-muted">
          No builder signals yet —{" "}
          <Link href="/ask" className="font-semibold text-[#4AAA27] no-underline">
            Ask AreaIQ
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white">
          <div className="grid grid-cols-[40px_1fr_56px_56px_1fr] gap-2 border-b border-neutral-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted sm:grid-cols-[48px_1.4fr_72px_72px_1fr_1fr] sm:px-4">
            <span>#</span>
            <span>Builder</span>
            <span>Score</span>
            <span>Projects</span>
            <span className="hidden sm:block">Delivery</span>
            <span>Trust</span>
          </div>
          <ul className="divide-y divide-neutral-100">
            {rows.map((row: BuilderLeaderboardRow) => (
              <li key={row.id}>
                <Link
                  href={row.href}
                  className="grid grid-cols-[40px_1fr_56px_56px_1fr] items-center gap-2 px-3 py-3 no-underline transition-colors hover:bg-[#F3FAEF] sm:grid-cols-[48px_1.4fr_72px_72px_1fr_1fr] sm:px-4"
                >
                  <span
                    className="text-sm font-bold tabular-nums"
                    style={{ color: row.rank <= 3 ? IQ_GREEN : undefined }}
                  >
                    {row.rank}
                  </span>
                  <span className="truncate text-sm font-semibold text-heading-primary">
                    {row.name}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-heading-primary">
                    {row.score ?? "—"}
                  </span>
                  <span className="text-sm tabular-nums text-body">{row.projects}</span>
                  <div className="hidden sm:block">
                    <p className="mb-1 text-[11px] font-semibold tabular-nums text-muted">
                      {row.deliveryPct != null ? `${row.deliveryPct}%` : "—"}
                    </p>
                    <ProgressBar value={row.deliveryPct} />
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] font-semibold tabular-nums text-muted">
                      {row.trustPct != null ? `${row.trustPct}%` : "—"}
                    </p>
                    <ProgressBar value={row.trustPct} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
