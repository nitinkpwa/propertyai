import "server-only";

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { type HealthCheckResult } from "./types";

/**
 * Filesystem / disk health probes.
 * Only imported via `runHealthChecks` (CLI / local tooling) — never from App Router.
 */

const ROOT = process.cwd();

function readPackageJson(): {
  version: string;
  next?: string;
  eslintNext?: string;
  react?: string;
} {
  try {
    const raw = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
      version?: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return {
      version: raw.version ?? "0.0.0",
      next: raw.dependencies?.next,
      eslintNext: raw.devDependencies?.["eslint-config-next"],
      react: raw.dependencies?.react,
    };
  } catch {
    return { version: "0.0.0" };
  }
}

function installedNextVersion(): string | null {
  try {
    return readPackageJson().next?.replace(/^[\^~]/, "") ?? null;
  } catch {
    return null;
  }
}

/** Duplicate keys in .env.local */
export function checkDuplicateEnvKeys(): HealthCheckResult {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) {
    return {
      id: "env.duplicates",
      name: "Duplicate environment variables",
      category: "environment",
      severity: "warn",
      message: ".env.local not found",
      fix: "Create .env.local from .env.example.",
    };
  }

  try {
    const lines = readFileSync(path, "utf8").split(/\r?\n/);
    const seen = new Map<string, number>();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
    if (dupes.length > 0) {
      return {
        id: "env.duplicates",
        name: "Duplicate environment variables",
        category: "environment",
        severity: "warn",
        message: `Duplicate keys in .env.local: ${dupes.join(", ")}`,
        fix: "Keep a single definition per key; later values override earlier ones unpredictably.",
        details: { duplicateCount: dupes.length },
      };
    }
    return {
      id: "env.duplicates",
      name: "Duplicate environment variables",
      category: "environment",
      severity: "pass",
      message: "No duplicate keys in .env.local.",
      details: { keyCount: seen.size },
    };
  } catch (err) {
    return {
      id: "env.duplicates",
      name: "Duplicate environment variables",
      category: "environment",
      severity: "warn",
      message: `Could not parse .env.local: ${err instanceof Error ? err.message : "error"}`,
    };
  }
}

/** Stale / mixed .next cache */
export function checkNextCache(): HealthCheckResult {
  const nextDir = join(ROOT, ".next");
  if (!existsSync(nextDir)) {
    return {
      id: "cache.next",
      name: "Stale .next cache",
      category: "cache",
      severity: "pass",
      message: "No .next directory (clean — will be created on next compile).",
    };
  }

  const hasDev = existsSync(join(nextDir, "dev"));
  const hasProdServer = existsSync(join(nextDir, "server"));
  const hasBuildId = existsSync(join(nextDir, "BUILD_ID"));
  const hasTurbopack = existsSync(join(nextDir, "turbopack"));
  const mixed = (hasDev || hasTurbopack) && (hasProdServer || hasBuildId);

  let ageHours: number | null = null;
  try {
    ageHours = Math.round(
      (Date.now() - statSync(nextDir).mtimeMs) / (1000 * 60 * 60),
    );
  } catch {
    /* ignore */
  }

  if (mixed) {
    return {
      id: "cache.next",
      name: "Stale .next cache",
      category: "cache",
      severity: "warn",
      message: "Mixed .next cache (dev + production artifacts).",
      fix: "Remove-Item -Recurse -Force .next; then npm run dev or npm run build.",
      details: { hasDev, hasProdServer, hasBuildId, hasTurbopack, ageHours },
    };
  }

  return {
    id: "cache.next",
    name: "Stale .next cache",
    category: "cache",
    severity: "pass",
    message: "`.next` layout looks consistent for the current mode.",
    details: { hasDev, hasProdServer, hasBuildId, hasTurbopack, ageHours },
  };
}

/** npm package inconsistencies */
export function checkNpmPackages(): HealthCheckResult {
  const pkg = readPackageJson();
  const installed = installedNextVersion();
  const declared = pkg.next?.replace(/^[\^~]/, "") ?? null;
  const eslintNext = pkg.eslintNext?.replace(/^[\^~]/, "") ?? null;

  const issues: string[] = [];
  if (declared && installed && declared !== installed) {
    issues.push(`package.json next@${declared} vs installed ${installed}`);
  }
  if (declared && eslintNext && declared !== eslintNext) {
    issues.push(`next@${declared} vs eslint-config-next@${eslintNext}`);
  }
  const lockA = ["package", "lock", "json"].join(".");
  const lockB = ["pnpm", "lock", "yaml"].join(".");
  if (!existsSync(join(ROOT, lockA)) && !existsSync(join(ROOT, lockB))) {
    issues.push("No lockfile found");
  }

  if (issues.length > 0) {
    return {
      id: "packages.consistency",
      name: "npm package consistency",
      category: "runtime",
      severity: "warn",
      message: issues.join("; "),
      fix: "Align next and eslint-config-next versions; run npm ci.",
      details: { declaredNext: declared, installedNext: installed, eslintNext },
    };
  }

  return {
    id: "packages.consistency",
    name: "npm package consistency",
    category: "runtime",
    severity: "pass",
    message: `next@${installed ?? declared} matches declared tooling.`,
    details: { installedNext: installed, react: pkg.react ?? null },
  };
}

/** Middleware / proxy */
export function checkMiddlewareProxy(): HealthCheckResult {
  const mw = ["middleware", "ts"].join(".");
  const px = ["proxy", "ts"].join(".");
  const hasMiddleware = existsSync(join(ROOT, mw));
  const hasProxy = existsSync(join(ROOT, px));
  const hasSrcMiddleware = existsSync(join(ROOT, "src", mw));

  if (!hasMiddleware && !hasProxy && !hasSrcMiddleware) {
    return {
      id: "config.middleware",
      name: "Middleware / proxy",
      category: "config",
      severity: "warn",
      message: "No middleware.ts or proxy.ts found — auth gates may be inactive.",
      fix: "Restore middleware.ts for role-based route protection.",
    };
  }

  if (hasMiddleware && !hasProxy) {
    return {
      id: "config.middleware",
      name: "Middleware / proxy",
      category: "config",
      severity: "warn",
      message:
        "middleware.ts present; Next.js 16 deprecates this convention in favor of proxy.ts.",
      fix: "Plan migration to proxy.ts when upgrading; current middleware remains functional.",
      details: { middleware: true, proxy: false },
    };
  }

  return {
    id: "config.middleware",
    name: "Middleware / proxy",
    category: "config",
    severity: "pass",
    message: hasProxy
      ? "proxy.ts is present."
      : "middleware.ts is present and will run on matched routes.",
    details: { middleware: hasMiddleware, proxy: hasProxy },
  };
}

/** Missing database migrations (local files + live probe) */
export async function checkDatabaseMigrations(): Promise<HealthCheckResult> {
  const migrationsDir = join(ROOT, "supabase", "migrations");
  if (!existsSync(migrationsDir)) {
    return {
      id: "database.migrations",
      name: "Database migrations",
      category: "database",
      severity: "warn",
      message: "supabase/migrations folder missing.",
      fix: "Restore migration SQL under supabase/migrations.",
    };
  }

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const latest = files[files.length - 1] ?? null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) {
    return {
      id: "database.migrations",
      name: "Database migrations",
      category: "database",
      severity: "warn",
      message: `${files.length} local migrations; cannot verify remote (service role missing).`,
      fix: "Set SUPABASE_SERVICE_ROLE_KEY to probe schema markers.",
      details: { localCount: files.length, latest },
    };
  }

  try {
    const client = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const probes: Array<{ label: string; ok: boolean; error?: string }> = [];

    const legal = await client
      .from("properties")
      .select("id, approved_building_plan, rera_certificate")
      .limit(1);
    probes.push({
      label: "legal_verification_columns",
      ok: !legal.error || !/column|42703/i.test(legal.error.message),
      error: legal.error?.message,
    });

    const deleted = await client
      .from("properties")
      .select("id, deleted_at")
      .limit(1);
    probes.push({
      label: "soft_delete_deleted_at",
      ok: !deleted.error || !/column|42703/i.test(deleted.error.message),
      error: deleted.error?.message,
    });

    const calculated = await client
      .from("properties")
      .select("id, calculated_price")
      .limit(1);
    probes.push({
      label: "calculated_price",
      ok: !calculated.error || !/column|42703/i.test(calculated.error.message),
      error: calculated.error?.message,
    });

    const failed = probes.filter((p) => !p.ok);
    if (failed.length > 0) {
      return {
        id: "database.migrations",
        name: "Database migrations",
        category: "database",
        severity: "fail",
        message: `Schema markers missing: ${failed.map((f) => f.label).join(", ")}`,
        fix: `Apply supabase/migrations (latest: ${latest}) via Supabase CLI or SQL editor.`,
        details: {
          localCount: files.length,
          latest,
          failed: failed.map((f) => f.label).join(", "),
        },
      };
    }

    return {
      id: "database.migrations",
      name: "Database migrations",
      category: "database",
      severity: "pass",
      message: `Local migrations (${files.length}) and key schema markers look present.`,
      details: { localCount: files.length, latest },
    };
  } catch (err) {
    return {
      id: "database.migrations",
      name: "Database migrations",
      category: "database",
      severity: "warn",
      message: `Could not probe schema: ${err instanceof Error ? err.message : "error"}`,
      details: { localCount: files.length, latest },
    };
  }
}

/** Broken API routes (file presence) */
export function checkApiRoutes(): HealthCheckResult {
  const route = (parts: string[]) => parts.join("/");
  const requiredRoutes = [
    route(["app", "api", "ask", "route.ts"]),
    route(["app", "api", "admin", "revalidate", "route.ts"]),
    route(["app", "api", "system", "health", "route.ts"]),
  ];
  const missing = requiredRoutes.filter((p) => !existsSync(join(ROOT, p)));
  if (missing.length > 0) {
    return {
      id: "api.routes",
      name: "API route integrity",
      category: "api",
      severity: "fail",
      message: `Missing route files: ${missing.join(", ")}`,
      fix: "Restore the missing API route modules from source control.",
      details: { missing: missing.length },
    };
  }

  return {
    id: "api.routes",
    name: "API route integrity",
    category: "api",
    severity: "pass",
    message: "Critical API route modules are present on disk.",
    details: { checked: requiredRoutes.length },
  };
}

/**
 * Next.js config — presence only.
 * Filenames assembled at runtime so NFT cannot statically include next.config.*.
 */
export function checkNextConfig(): HealthCheckResult {
  const base = ["next", "config"].join(".");
  const candidates = ["ts", "js", "mjs"].map((ext) => `${base}.${ext}`);
  const found = candidates.find((name) => existsSync(join(ROOT, name)));
  if (!found) {
    return {
      id: "config.next",
      name: "Next.js config",
      category: "config",
      severity: "fail",
      message: "No Next.js config file found.",
      fix: "Restore the Next.js config file from the repository.",
    };
  }

  return {
    id: "config.next",
    name: "Next.js config",
    category: "config",
    severity: "pass",
    message: "Next.js config file is present.",
    details: { file: found },
  };
}

/** Build / runtime version mismatch */
export function checkBuildRuntimeMismatch(): HealthCheckResult {
  const pkg = readPackageJson();
  const appVersion =
    process.env.NEXT_PUBLIC_APP_VERSION?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
    pkg.version;

  let buildId: string | null = null;
  const buildIdPath = join(ROOT, ".next", "BUILD_ID");
  if (existsSync(buildIdPath)) {
    try {
      buildId = readFileSync(buildIdPath, "utf8").trim();
    } catch {
      buildId = null;
    }
  }

  const details = {
    packageVersion: pkg.version,
    appVersion,
    buildId,
    nodeEnv: process.env.NODE_ENV ?? null,
  };

  if (
    process.env.NODE_ENV === "production" &&
    buildId &&
    appVersion &&
    buildId !== appVersion &&
    !buildId.startsWith(appVersion)
  ) {
    return {
      id: "runtime.version",
      name: "Build / runtime version mismatch",
      category: "runtime",
      severity: "warn",
      message: `BUILD_ID (${buildId}) differs from APP_VERSION (${appVersion}).`,
      fix: "Redeploy so build id and NEXT_PUBLIC_APP_VERSION stay aligned.",
      details,
    };
  }

  return {
    id: "runtime.version",
    name: "Build / runtime version mismatch",
    category: "runtime",
    severity: "pass",
    message: `Runtime version ${appVersion} looks consistent.`,
    details,
  };
}
