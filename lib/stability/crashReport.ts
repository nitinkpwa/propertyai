/**
 * Lightweight render breadcrumb + crash report for runtime debugging.
 * Dev-only verbosity; last crash always persisted for /debug and overlays.
 */

export const CRASH_STORAGE_KEY = "areaiq_last_crash_v1";
export const RENDER_TRACE_KEY = "areaiq_render_trace_v1";

export interface CrashReport {
  at: string;
  component: string;
  message: string;
  stack?: string;
  digest?: string;
  route?: string;
  userId?: string | null;
  role?: string | null;
  sessionStatus?: string | null;
  api?: string | null;
  response?: string | null;
  renderTrace: string[];
}

const MAX_TRACE = 40;
let trace: string[] = [];

export function traceRender(component: string) {
  const line = `${new Date().toISOString().slice(11, 23)} ${component}`;
  trace = [...trace.slice(-(MAX_TRACE - 1)), line];
  if (process.env.NODE_ENV === "development" && typeof console !== "undefined") {
    console.log(`[AreaIQ:render] ${component}`);
  }
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(RENDER_TRACE_KEY, JSON.stringify(trace));
    }
  } catch {
    /* ignore */
  }
}

export function getRenderTrace(): string[] {
  if (trace.length) return [...trace];
  try {
    if (typeof sessionStorage === "undefined") return [];
    const raw = sessionStorage.getItem(RENDER_TRACE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function recordCrash(partial: Omit<CrashReport, "at" | "renderTrace"> & { renderTrace?: string[] }) {
  const report: CrashReport = {
    at: new Date().toISOString(),
    renderTrace: partial.renderTrace ?? getRenderTrace(),
    component: partial.component,
    message: partial.message,
    stack: partial.stack,
    digest: partial.digest,
    route: partial.route ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
    userId: partial.userId,
    role: partial.role,
    sessionStatus: partial.sessionStatus,
    api: partial.api,
    response: partial.response,
  };

  if (typeof console !== "undefined") {
    console.error(`[AreaIQ:crash] ${report.component}: ${report.message}`, report);
  }

  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(CRASH_STORAGE_KEY, JSON.stringify(report));
    }
  } catch {
    /* ignore */
  }

  return report;
}

export function readLastCrash(): CrashReport | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    const raw = sessionStorage.getItem(CRASH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CrashReport;
  } catch {
    return null;
  }
}

export function logAsyncFailure(input: {
  component: string;
  api: string;
  error: unknown;
  userId?: string | null;
}) {
  const err = input.error;
  const message = err instanceof Error ? err.message : String(err ?? "unknown");
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(`[AreaIQ:async] ${input.component} / ${input.api}`, {
    message,
    stack,
    component: input.component,
    api: input.api,
    userId: input.userId ?? null,
    route: typeof window !== "undefined" ? window.location.pathname : null,
  });
}
