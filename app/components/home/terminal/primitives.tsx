"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { IQ_GREEN } from "../theme";

export function TerminalSectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#4AAA27]">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-heading-primary sm:text-3xl">
          {title}
        </h2>
      </div>
      {action ? (
        <Link
          href={action.href}
          className="shrink-0 text-sm font-semibold text-[#4AAA27] no-underline hover:text-emerald-700"
        >
          {action.label} →
        </Link>
      ) : null}
    </div>
  );
}

export function MetricTile({
  label,
  value,
  href,
  accent,
  children,
}: {
  label: string;
  value: string | null;
  href: string;
  accent?: boolean;
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-neutral-200/80 bg-white p-4 no-underline shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)]"
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      <span
        className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-heading-primary sm:text-3xl"
        style={accent && value ? { color: IQ_GREEN } : undefined}
      >
        {value ?? "—"}
      </span>
      {children}
    </Link>
  );
}

export function RadialGauge({
  value,
  label,
  size = 112,
  href,
}: {
  value: number | null;
  label: string;
  size?: number;
  href?: string;
}) {
  const reduce = useReducedMotion();
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = value != null ? Math.min(100, Math.max(0, value)) / 100 : 0;
  const offset = c * (1 - pct);
  const display = value != null ? Math.round(value) : "—";

  const inner = (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#E8ECF0"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={IQ_GREEN}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={reduce ? false : { strokeDashoffset: c }}
            animate={{ strokeDashoffset: value != null ? offset : c }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold tabular-nums text-heading-primary">
            {display}
          </span>
        </div>
      </div>
      <p className="text-xs font-semibold text-muted">{label}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="relative inline-flex no-underline">
        {inner}
      </Link>
    );
  }
  return <div className="relative inline-flex">{inner}</div>;
}

export function SparkBars({
  values,
  className = "",
}: {
  values: number[];
  className?: string;
}) {
  const max = Math.max(...values, 1);
  return (
    <div className={`flex h-8 items-end gap-0.5 ${className}`} aria-hidden>
      {values.map((v, i) => (
        <motion.div
          key={i}
          className="w-1.5 rounded-sm bg-[#4AAA27]/70"
          initial={{ height: 2 }}
          animate={{ height: `${Math.max(8, (v / max) * 100)}%` }}
          transition={{ delay: i * 0.04, duration: 0.4 }}
        />
      ))}
    </div>
  );
}

export function ProgressBar({
  value,
  max = 100,
}: {
  value: number | null;
  max?: number;
}) {
  const pct = value != null ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: IQ_GREEN }}
        initial={{ width: 0 }}
        animate={{ width: value != null ? `${pct}%` : "0%" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-neutral-100 ${className ?? ""}`}
    />
  );
}

export function BandDot({
  band,
}: {
  band?: string | null;
}) {
  const color =
    band === "high" || band === "bullish"
      ? IQ_GREEN
      : band === "medium" || band === "neutral"
        ? "#D4A017"
        : band === "low" || band === "bearish"
          ? "#C45C4A"
          : "#A3A3A3";
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}
