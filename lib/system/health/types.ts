import "server-only";

export type HealthSeverity = "pass" | "warn" | "fail" | "skip";

export interface HealthCheckResult {
  id: string;
  name: string;
  category:
    | "environment"
    | "connectivity"
    | "runtime"
    | "cache"
    | "database"
    | "storage"
    | "config"
    | "api";
  severity: HealthSeverity;
  /** Short human-readable outcome (never secrets). */
  message: string;
  /** Actionable remediation when not pass. */
  fix?: string;
  /** Safe diagnostic details (hosts, versions, counts — never key material). */
  details?: Record<string, string | number | boolean | null>;
  durationMs?: number;
}

export interface HealthReport {
  ok: boolean;
  score: number;
  generatedAt: string;
  environment: "development" | "production" | "test" | string;
  nodeEnv: string;
  summary: {
    total: number;
    passed: number;
    warnings: number;
    critical: number;
    skipped: number;
  };
  checks: HealthCheckResult[];
  /** Highest-priority failures first. */
  critical: HealthCheckResult[];
  warnings: HealthCheckResult[];
  passed: HealthCheckResult[];
  skipped: HealthCheckResult[];
}

export function scoreHealth(checks: HealthCheckResult[]): number {
  if (checks.length === 0) return 0;
  const scored = checks.filter((c) => c.severity !== "skip");
  if (scored.length === 0) return 100;

  let points = 0;
  for (const c of scored) {
    if (c.severity === "pass") points += 100;
    else if (c.severity === "warn") points += 55;
    else points += 0;
  }
  return Math.round(points / scored.length);
}

export function buildHealthReport(checks: HealthCheckResult[]): HealthReport {
  const passed = checks.filter((c) => c.severity === "pass");
  const warnings = checks.filter((c) => c.severity === "warn");
  const critical = checks.filter((c) => c.severity === "fail");
  const skipped = checks.filter((c) => c.severity === "skip");
  const score = scoreHealth(checks);

  return {
    ok: critical.length === 0,
    score,
    generatedAt: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? "unknown",
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    summary: {
      total: checks.length,
      passed: passed.length,
      warnings: warnings.length,
      critical: critical.length,
      skipped: skipped.length,
    },
    checks,
    critical,
    warnings,
    passed,
    skipped,
  };
}

/** Mask secrets — never return raw env values. */
export function envPresence(name: string): "set" | "missing" {
  const v = process.env[name];
  return v && v.trim().length > 0 ? "set" : "missing";
}

export function safeHostname(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return "invalid-url";
  }
}
