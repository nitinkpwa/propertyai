/**
 * Request-scoped wall-clock timing for Cloudflare Error 1102 investigations.
 *
 * Notes:
 * - Cloudflare CPU budget counts JS execution, not await/network idle time.
 * - These timers measure wall clock (includes I/O). Use them to rank work;
 *   interpret high wall + low compute as I/O; high wall on pure CPU paths as
 *   budget risk.
 * - Uses console.warn so logs survive next.config removeConsole in production
 *   (only error/warn are kept).
 */

export type PerfSample = {
  name: string;
  durationMs: number;
  detail?: Record<string, unknown>;
  at: number;
};

export type PerfReport = {
  requestId: string;
  route?: string;
  samples: PerfSample[];
  totalMs: number;
  startedAt: number;
};

type PerfStore = {
  requestId: string;
  route?: string;
  startedAt: number;
  samples: PerfSample[];
};

const globalKey = "__areaiq_perf_store__";

function getStore(): PerfStore | null {
  const g = globalThis as unknown as Record<string, PerfStore | undefined>;
  return g[globalKey] ?? null;
}

function setStore(store: PerfStore | null) {
  const g = globalThis as unknown as Record<string, PerfStore | null | undefined>;
  g[globalKey] = store;
}

function newRequestId(): string {
  try {
    return crypto.randomUUID().slice(0, 8);
  } catch {
    return `p${Date.now().toString(36)}`;
  }
}

/** Begin a request timing scope (call once at the edge of middleware / handlers). */
export function startPerfRequest(route?: string): string {
  const requestId = newRequestId();
  setStore({
    requestId,
    route,
    startedAt: Date.now(),
    samples: [],
  });
  return requestId;
}

export function setPerfRoute(route: string) {
  const store = getStore();
  if (store) store.route = route;
}

const PERF_VERBOSE = process.env.AREAIQ_PERF === "1";
const PERF_LOG_THRESHOLD_MS = 80;

function shouldEmitPerf(durationMs: number) {
  return PERF_VERBOSE || durationMs >= PERF_LOG_THRESHOLD_MS;
}

export function recordPerf(
  name: string,
  durationMs: number,
  detail?: Record<string, unknown>,
) {
  const store = getStore();
  const sample: PerfSample = {
    name,
    durationMs: Math.round(durationMs * 100) / 100,
    detail,
    at: Date.now(),
  };
  if (store) {
    store.samples.push(sample);
  }
  // Quiet by default — logging itself burns Worker CPU. Opt in with AREAIQ_PERF=1.
  if (!shouldEmitPerf(sample.durationMs)) return;
  console.warn(
    `[perf] ${sample.durationMs.toFixed(1)}ms ${name}`,
    detail
      ? { requestId: store?.requestId, route: store?.route, ...detail }
      : { requestId: store?.requestId, route: store?.route },
  );
}

/** Time an async function and record the sample. */
export async function timed<T>(
  name: string,
  fn: () => Promise<T>,
  detail?: Record<string, unknown>,
): Promise<T> {
  const t0 = performance.now();
  try {
    return await fn();
  } finally {
    recordPerf(name, performance.now() - t0, detail);
  }
}

/** Time a sync function and record the sample. */
export function timedSync<T>(
  name: string,
  fn: () => T,
  detail?: Record<string, unknown>,
): T {
  const t0 = performance.now();
  try {
    return fn();
  } finally {
    recordPerf(name, performance.now() - t0, detail);
  }
}

export function getPerfReport(): PerfReport | null {
  const store = getStore();
  if (!store) return null;
  return {
    requestId: store.requestId,
    route: store.route,
    samples: [...store.samples].sort((a, b) => b.durationMs - a.durationMs),
    totalMs: Date.now() - store.startedAt,
    startedAt: store.startedAt,
  };
}

/** Flush ranked samples to Workers Logs. */
export function flushPerfReport(label = "request"): PerfReport | null {
  const report = getPerfReport();
  if (!report) return null;
  const slow = report.samples.some((s) => s.durationMs >= PERF_LOG_THRESHOLD_MS);
  if (!PERF_VERBOSE && !slow) return report;
  const top = report.samples.slice(0, 20).map((s) => ({
    name: s.name,
    ms: s.durationMs,
    detail: s.detail,
  }));
  console.warn(`[perf:summary] ${label}`, {
    requestId: report.requestId,
    route: report.route,
    totalMs: report.totalMs,
    sampleCount: report.samples.length,
    top20: top,
  });
  return report;
}

export function endPerfRequest(label = "request"): PerfReport | null {
  const report = flushPerfReport(label);
  setStore(null);
  return report;
}

/** Build a Server-Timing header value from collected samples. */
export function toServerTimingHeader(max = 12): string | null {
  const store = getStore();
  if (!store || store.samples.length === 0) return null;
  return store.samples
    .slice()
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, max)
    .map((s) => {
      const metric = s.name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
      return `${metric};dur=${s.durationMs.toFixed(1)}`;
    })
    .join(", ");
}
