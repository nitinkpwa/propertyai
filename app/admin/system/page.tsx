"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminLeadsChrome from "@/components/admin/leads/AdminLeadsChrome";

type Severity = "pass" | "warn" | "fail" | "skip";

interface HealthCheck {
  id: string;
  name: string;
  category: string;
  severity: Severity;
  message: string;
  fix?: string;
  details?: Record<string, string | number | boolean | null>;
  durationMs?: number;
}

interface HealthReport {
  ok: boolean;
  score: number;
  generatedAt: string;
  environment: string;
  summary: {
    total: number;
    passed: number;
    warnings: number;
    critical: number;
    skipped: number;
  };
  checks: HealthCheck[];
  critical: HealthCheck[];
  warnings: HealthCheck[];
  passed: HealthCheck[];
  skipped: HealthCheck[];
}

function tone(severity: Severity): {
  bg: string;
  text: string;
  ring: string;
  label: string;
} {
  if (severity === "pass") {
    return {
      bg: "bg-emerald-50",
      text: "text-emerald-800",
      ring: "ring-emerald-200",
      label: "Healthy",
    };
  }
  if (severity === "warn") {
    return {
      bg: "bg-amber-50",
      text: "text-amber-900",
      ring: "ring-amber-200",
      label: "Warning",
    };
  }
  if (severity === "fail") {
    return {
      bg: "bg-rose-50",
      text: "text-rose-900",
      ring: "ring-rose-200",
      label: "Critical",
    };
  }
  return {
    bg: "bg-neutral-50",
    text: "text-neutral-700",
    ring: "ring-neutral-200",
    label: "Skipped",
  };
}

function scoreTone(score: number): string {
  if (score >= 90) return "text-emerald-700";
  if (score >= 70) return "text-amber-700";
  return "text-rose-700";
}

function CheckRow({ check }: { check: HealthCheck }) {
  const t = tone(check.severity);
  return (
    <article
      className={`rounded-2xl border border-neutral-200/80 ${t.bg} p-4 ring-1 ${t.ring}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-bold uppercase tracking-wide ${t.text}`}>
              {check.severity === "pass"
                ? "🟢"
                : check.severity === "warn"
                  ? "🟡"
                  : check.severity === "fail"
                    ? "🔴"
                    : "⚪"}{" "}
              {t.label}
            </span>
            <span className="rounded-md bg-white/70 px-2 py-0.5 text-[11px] font-medium text-muted">
              {check.category}
            </span>
            {typeof check.durationMs === "number" ? (
              <span className="text-[11px] text-muted">{check.durationMs}ms</span>
            ) : null}
          </div>
          <h3 className="mt-1.5 text-sm font-semibold text-heading-primary">
            {check.name}
          </h3>
          <p className="mt-1 text-sm text-body">{check.message}</p>
          {check.fix ? (
            <p className="mt-2 text-sm font-medium text-heading-secondary">
              Fix: {check.fix}
            </p>
          ) : null}
        </div>
        <code className="shrink-0 rounded-lg bg-white/80 px-2 py-1 text-[11px] text-muted">
          {check.id}
        </code>
      </div>
      {check.details && Object.keys(check.details).length > 0 ? (
        <dl className="mt-3 grid gap-1 border-t border-black/5 pt-3 sm:grid-cols-2">
          {Object.entries(check.details).map(([k, v]) => (
            <div key={k} className="flex gap-2 text-xs">
              <dt className="font-medium text-muted">{k}</dt>
              <dd className="text-body">{String(v)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}

export default function AdminSystemHealthPage() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/system/health", { cache: "no-store" });
      const body = (await res.json()) as HealthReport & { error?: string };
      if (!res.ok && !body.checks) {
        setError(body.error ?? `Health API returned ${res.status}`);
        setReport(null);
      } else {
        setReport(body);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load health report");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminLeadsChrome
      title="System Health"
      subtitle="Developer diagnostics"
      backHref="/admin"
      backLabel="← Control Panel"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading-primary">
            Developer Health Check
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Detects startup, env, connectivity, cache, and schema issues before they
            surface as generic browser failures. Secrets are never displayed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/debug"
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-body hover:bg-neutral-50"
          >
            Debug console
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? "Running…" : "Re-run checks"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {loading && !report ? (
        <div className="flex justify-center py-20">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
        </div>
      ) : null}

      {report ? (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Overall score
              </p>
              <p className={`mt-2 text-4xl font-bold tabular-nums ${scoreTone(report.score)}`}>
                {report.score}
                <span className="text-lg font-semibold text-muted">/100</span>
              </p>
              <p className="mt-2 text-sm text-body">
                {report.ok ? "No critical failures" : "Critical issues require attention"}
              </p>
            </div>
            {(
              [
                ["Passed", report.summary.passed, "text-emerald-700"],
                ["Warnings", report.summary.warnings, "text-amber-700"],
                ["Critical", report.summary.critical, "text-rose-700"],
                ["Skipped", report.summary.skipped, "text-neutral-600"],
              ] as const
            ).map(([label, value, color]) => (
              <div
                key={label}
                className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {label}
                </p>
                <p className={`mt-2 text-3xl font-bold tabular-nums ${color}`}>{value}</p>
              </div>
            ))}
          </section>

          <p className="text-xs text-muted">
            Generated {new Date(report.generatedAt).toLocaleString()} · env{" "}
            <span className="font-medium text-body">{report.environment}</span>
          </p>

          {report.critical.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-rose-800">Critical failures</h2>
              {report.critical.map((c) => (
                <CheckRow key={c.id} check={c} />
              ))}
            </section>
          ) : null}

          {report.warnings.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-amber-800">Warnings</h2>
              {report.warnings.map((c) => (
                <CheckRow key={c.id} check={c} />
              ))}
            </section>
          ) : null}

          {report.passed.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-emerald-800">Passed</h2>
              {report.passed.map((c) => (
                <CheckRow key={c.id} check={c} />
              ))}
            </section>
          ) : null}

          {report.skipped.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-700">Skipped</h2>
              {report.skipped.map((c) => (
                <CheckRow key={c.id} check={c} />
              ))}
            </section>
          ) : null}
        </div>
      ) : null}
    </AdminLeadsChrome>
  );
}
