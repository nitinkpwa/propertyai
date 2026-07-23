"use client";

import { useEffect, useState } from "react";
import type { CrashReport } from "@/lib/stability/crashReport";
import { getRenderTrace, readLastCrash } from "@/lib/stability/crashReport";

interface DevCrashOverlayProps {
  error?: Error & { digest?: string };
  component?: string;
  reset?: () => void;
  /** When true, always show (even outside NODE_ENV=development) if crash report exists */
  force?: boolean;
}

/**
 * Development crash overlay — replaces opaque "Something went wrong" with
 * component, stack, route, session breadcrumbs, and render trace.
 */
export default function DevCrashOverlay({
  error,
  component,
  reset,
  force = false,
}: DevCrashOverlayProps) {
  const [report, setReport] = useState<CrashReport | null>(null);
  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    const stored = readLastCrash();
    if (error) {
      setReport({
        at: new Date().toISOString(),
        component: component ?? stored?.component ?? "Unknown",
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        route: typeof window !== "undefined" ? window.location.pathname : stored?.route,
        userId: stored?.userId ?? null,
        role: stored?.role ?? null,
        sessionStatus: stored?.sessionStatus ?? null,
        api: stored?.api ?? null,
        response: stored?.response ?? null,
        renderTrace: getRenderTrace(),
      });
      return;
    }
    setReport(stored);
  }, [error, component]);

  if (!force && !isDev) return null;
  if (!report && !error) return null;

  const data = report ?? {
    at: new Date().toISOString(),
    component: component ?? "Unknown",
    message: error?.message ?? "Unknown error",
    stack: error?.stack,
    digest: error?.digest,
    route: typeof window !== "undefined" ? window.location.pathname : undefined,
    renderTrace: getRenderTrace(),
  };

  return (
    <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-rose-200 bg-rose-50 text-left shadow-lg">
      <div className="border-b border-rose-200 bg-rose-100 px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-rose-800">
          AreaIQ Dev Crash Overlay
        </p>
        <p className="mt-1 text-sm font-semibold text-rose-950">
          {data.component}: {data.message}
        </p>
      </div>
      <div className="space-y-3 px-4 py-4 font-mono text-[11px] leading-relaxed text-rose-950">
        <Row label="Route" value={data.route ?? "—"} />
        <Row label="Digest" value={data.digest ?? "—"} />
        <Row label="User" value={data.userId ?? "—"} />
        <Row label="Role" value={data.role ?? "—"} />
        <Row label="Session" value={data.sessionStatus ?? "—"} />
        <Row label="API" value={data.api ?? "—"} />
        <Row label="Response" value={data.response ?? "—"} />
        <div>
          <p className="mb-1 font-sans text-[10px] font-bold uppercase tracking-wider text-rose-700">
            Render trace (last → crash)
          </p>
          <pre className="max-h-40 overflow-auto rounded-lg bg-white/80 p-2 text-[10px] text-rose-900">
            {(data.renderTrace ?? []).join("\n") || "(empty)"}
          </pre>
        </div>
        <div>
          <p className="mb-1 font-sans text-[10px] font-bold uppercase tracking-wider text-rose-700">
            Stack
          </p>
          <pre className="max-h-56 overflow-auto rounded-lg bg-white/80 p-2 text-[10px] text-rose-900 whitespace-pre-wrap">
            {data.stack ?? "(no stack)"}
          </pre>
        </div>
        {reset ? (
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-rose-700 px-3 py-2 font-sans text-xs font-semibold text-white"
          >
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-20 shrink-0 font-sans text-[10px] font-bold uppercase tracking-wider text-rose-700">
        {label}
      </span>
      <span className="break-all">{value}</span>
    </div>
  );
}
