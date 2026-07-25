import "server-only";

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  envPresence,
  safeHostname,
  type HealthCheckResult,
} from "./types";

const ROOT = process.cwd();

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

const RECOMMENDED_ENV = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "NEXT_PUBLIC_SITE_URL",
] as const;

const OPTIONAL_CLOUDFLARE = [
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ZONE_ID",
  "CF_IMAGES_ACCOUNT_HASH",
] as const;

const RECOMMENDED_NODE_MAJOR = [20, 22] as const;
const PROPERTY_PHOTOS_BUCKET = "property-photos";

async function timed<T>(
  fn: () => Promise<T>,
): Promise<{ value: T; durationMs: number }> {
  const start = Date.now();
  const value = await fn();
  return { value, durationMs: Date.now() - start };
}

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
    const raw = readFileSync(
      join(ROOT, "node_modules", "next", "package.json"),
      "utf8",
    );
    return (JSON.parse(raw) as { version?: string }).version ?? null;
  } catch {
    return null;
  }
}

/** 1. Required / recommended env vars (presence only). */
export function checkEnvVariables(): HealthCheckResult {
  const missingRequired = REQUIRED_ENV.filter((k) => envPresence(k) === "missing");
  const missingRecommended = RECOMMENDED_ENV.filter(
    (k) => envPresence(k) === "missing",
  );

  const details: Record<string, string | number | boolean | null> = {
    supabaseUrl: envPresence("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: envPresence("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    supabaseServiceRole: envPresence("SUPABASE_SERVICE_ROLE_KEY"),
    openaiApiKey: envPresence("OPENAI_API_KEY"),
    siteUrl: envPresence("NEXT_PUBLIC_SITE_URL"),
    supabaseHost: safeHostname(process.env.NEXT_PUBLIC_SUPABASE_URL),
  };

  if (missingRequired.length > 0) {
    return {
      id: "env.required",
      name: "Required environment variables",
      category: "environment",
      severity: "fail",
      message: `Missing required vars: ${missingRequired.join(", ")}`,
      fix: "Copy .env.example → .env.local and fill Supabase URL + anon key.",
      details,
    };
  }

  if (missingRecommended.length > 0) {
    return {
      id: "env.required",
      name: "Required environment variables",
      category: "environment",
      severity: "warn",
      message: `Required vars OK; missing recommended: ${missingRecommended.join(", ")}`,
      fix: "Add SUPABASE_SERVICE_ROLE_KEY and OPENAI_API_KEY for admin/AI features.",
      details,
    };
  }

  return {
    id: "env.required",
    name: "Required environment variables",
    category: "environment",
    severity: "pass",
    message: "All required and recommended environment variables are set.",
    details,
  };
}

/** 13. Duplicate keys in .env.local */
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

/** 2. Supabase connectivity */
export async function checkSupabaseConnectivity(): Promise<HealthCheckResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return {
      id: "supabase.connectivity",
      name: "Supabase connectivity",
      category: "connectivity",
      severity: "fail",
      message: "Cannot probe Supabase — URL or anon key missing.",
      fix: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }

  try {
    const { value, durationMs } = await timed(async () => {
      const client = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      return client.from("profiles").select("id").limit(1);
    });

    if (value.error) {
      return {
        id: "supabase.connectivity",
        name: "Supabase connectivity",
        category: "connectivity",
        severity: "fail",
        message: `Supabase query failed: ${value.error.message}`,
        fix: "Verify project URL, anon key, and that the profiles table exists with public/authenticated RLS.",
        details: {
          host: safeHostname(url),
          code: value.error.code ?? null,
        },
        durationMs,
      };
    }

    return {
      id: "supabase.connectivity",
      name: "Supabase connectivity",
      category: "connectivity",
      severity: "pass",
      message: "Supabase responded to a profiles probe.",
      details: { host: safeHostname(url) },
      durationMs,
    };
  } catch (err) {
    return {
      id: "supabase.connectivity",
      name: "Supabase connectivity",
      category: "connectivity",
      severity: "fail",
      message: `Supabase unreachable: ${err instanceof Error ? err.message : "error"}`,
      fix: "Check network/DNS and Supabase project status.",
      details: { host: safeHostname(url) },
    };
  }
}

/** 3. OpenAI connectivity (if configured) */
export async function checkOpenAIConnectivity(): Promise<HealthCheckResult> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return {
      id: "openai.connectivity",
      name: "OpenAI connectivity",
      category: "connectivity",
      severity: "skip",
      message: "OPENAI_API_KEY not configured — Ask/AI features will be disabled.",
      fix: "Set OPENAI_API_KEY to enable AreaIQ Ask and insights.",
    };
  }

  try {
    const { value, durationMs } = await timed(async () => {
      const res = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8000),
      });
      return { status: res.status, ok: res.ok };
    });

    if (value.status === 401 || value.status === 403) {
      return {
        id: "openai.connectivity",
        name: "OpenAI connectivity",
        category: "connectivity",
        severity: "fail",
        message: `OpenAI rejected the API key (HTTP ${value.status}).`,
        fix: "Rotate OPENAI_API_KEY in the OpenAI dashboard and update .env.local.",
        durationMs,
      };
    }

    if (!value.ok) {
      return {
        id: "openai.connectivity",
        name: "OpenAI connectivity",
        category: "connectivity",
        severity: "warn",
        message: `OpenAI returned HTTP ${value.status}.`,
        fix: "Check OpenAI status page and rate limits.",
        durationMs,
      };
    }

    return {
      id: "openai.connectivity",
      name: "OpenAI connectivity",
      category: "connectivity",
      severity: "pass",
      message: "OpenAI API key accepted.",
      details: { configured: true },
      durationMs,
    };
  } catch (err) {
    return {
      id: "openai.connectivity",
      name: "OpenAI connectivity",
      category: "connectivity",
      severity: "warn",
      message: `OpenAI probe failed: ${err instanceof Error ? err.message : "error"}`,
      fix: "Check outbound HTTPS to api.openai.com (firewall/VPN).",
    };
  }
}

/** 4. Cloudflare (if configured) */
export function checkCloudflareConfig(): HealthCheckResult {
  const set = OPTIONAL_CLOUDFLARE.filter((k) => envPresence(k) === "set");
  if (set.length === 0) {
    return {
      id: "cloudflare.config",
      name: "Cloudflare configuration",
      category: "config",
      severity: "skip",
      message: "No Cloudflare env vars configured (optional for AreaIQ).",
      details: { configuredKeys: 0 },
    };
  }

  const incomplete =
    set.includes("CLOUDFLARE_API_TOKEN") !== set.includes("CLOUDFLARE_ACCOUNT_ID");

  if (incomplete) {
    return {
      id: "cloudflare.config",
      name: "Cloudflare configuration",
      category: "config",
      severity: "warn",
      message: "Partial Cloudflare credentials detected.",
      fix: "Set both CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN, or remove unused CF vars.",
      details: { configuredKeys: set.length },
    };
  }

  return {
    id: "cloudflare.config",
    name: "Cloudflare configuration",
    category: "config",
    severity: "pass",
    message: `Cloudflare env present (${set.length} keys).`,
    details: { configuredKeys: set.length },
  };
}

/** 5. Port — process is serving (health endpoint reachable implies bind OK). */
export function checkPortAvailability(): HealthCheckResult {
  const port = Number(process.env.PORT || 3000);
  return {
    id: "runtime.port",
    name: "Port availability",
    category: "runtime",
    severity: "pass",
    message: `Dev/runtime process is listening (health handler on port ${port}).`,
    details: {
      port,
      pid: process.pid,
      note: "If Ready shows but browser resets, delete .next and restart.",
    },
    fix: "If ERR_CONNECTION_RESET: Remove-Item -Recurse .next; npm run dev",
  };
}

/** 6. Stale / mixed .next cache */
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
      severity: "fail",
      message:
        "Mixed Turbopack/dev and production build artifacts in .next — can wedge the HTTP server.",
      fix: "Remove-Item -Recurse -Force .next; then npm run dev (or npm run build for prod).",
      details: {
        hasDev,
        hasProdServer,
        hasBuildId,
        hasTurbopack,
        ageHours,
      },
    };
  }

  if (process.env.NODE_ENV === "development" && hasBuildId && !hasDev) {
    return {
      id: "cache.next",
      name: "Stale .next cache",
      category: "cache",
      severity: "warn",
      message: "Production BUILD_ID present while running development mode.",
      fix: "Clear .next before npm run dev after a production build.",
      details: { hasBuildId, ageHours },
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

/** 7. Node version */
export function checkNodeVersion(): HealthCheckResult {
  const version = process.version;
  const major = Number(version.replace(/^v/, "").split(".")[0]);
  const recommended = RECOMMENDED_NODE_MAJOR.includes(
    major as (typeof RECOMMENDED_NODE_MAJOR)[number],
  );

  if (!Number.isFinite(major)) {
    return {
      id: "runtime.node",
      name: "Node.js version",
      category: "runtime",
      severity: "warn",
      message: `Unrecognized Node version: ${version}`,
      fix: "Install Node 20 LTS or 22 LTS.",
    };
  }

  if (major < 20) {
    return {
      id: "runtime.node",
      name: "Node.js version",
      category: "runtime",
      severity: "fail",
      message: `Node ${version} is below the minimum (20+).`,
      fix: "Upgrade to Node 20 LTS or 22 LTS.",
      details: { version, major },
    };
  }

  if (!recommended) {
    return {
      id: "runtime.node",
      name: "Node.js version",
      category: "runtime",
      severity: "warn",
      message: `Node ${version} works but is outside recommended LTS (20/22).`,
      fix: "Prefer Node 20 or 22 for Next.js 16 stability.",
      details: { version, major },
    };
  }

  return {
    id: "runtime.node",
    name: "Node.js version",
    category: "runtime",
    severity: "pass",
    message: `Node ${version} is within the recommended range.`,
    details: { version, major },
  };
}

/** 8. npm package inconsistencies */
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
  if (!existsSync(join(ROOT, "package-lock.json")) && !existsSync(join(ROOT, "pnpm-lock.yaml"))) {
    issues.push("No lockfile found");
  }
  if (!existsSync(join(ROOT, "node_modules", "next"))) {
    return {
      id: "packages.consistency",
      name: "npm package consistency",
      category: "runtime",
      severity: "fail",
      message: "next is not installed in node_modules.",
      fix: "Run npm install.",
    };
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

/** 9. Middleware / proxy */
export function checkMiddlewareProxy(): HealthCheckResult {
  const hasMiddleware = existsSync(join(ROOT, "middleware.ts"));
  const hasProxy = existsSync(join(ROOT, "proxy.ts"));
  const hasSrcMiddleware = existsSync(join(ROOT, "src", "middleware.ts"));

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

/** 10. Missing database migrations (local files + live probe) */
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

    // Probe markers from recent harden + legal migrations (safe column checks).
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

/** 11. Storage bucket accessibility */
export async function checkStorageBuckets(): Promise<HealthCheckResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = service || anon;

  if (!url || !key) {
    return {
      id: "storage.buckets",
      name: "Storage bucket accessibility",
      category: "storage",
      severity: "fail",
      message: "Cannot check storage — Supabase credentials missing.",
      fix: "Set NEXT_PUBLIC_SUPABASE_URL and a key.",
    };
  }

  try {
    const { value, durationMs } = await timed(async () => {
      const client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      return client.storage.listBuckets();
    });

    if (value.error) {
      return {
        id: "storage.buckets",
        name: "Storage bucket accessibility",
        category: "storage",
        severity: "warn",
        message: `listBuckets failed: ${value.error.message}`,
        fix: "Confirm storage is enabled and the key has permission.",
        durationMs,
      };
    }

    const names = (value.data ?? []).map((b) => b.name);
    const hasPhotos = names.includes(PROPERTY_PHOTOS_BUCKET);
    if (!hasPhotos) {
      return {
        id: "storage.buckets",
        name: "Storage bucket accessibility",
        category: "storage",
        severity: "fail",
        message: `Bucket "${PROPERTY_PHOTOS_BUCKET}" not found.`,
        fix: "Create a public property-photos bucket (see production storage migration).",
        details: { buckets: names.length },
        durationMs,
      };
    }

    return {
      id: "storage.buckets",
      name: "Storage bucket accessibility",
      category: "storage",
      severity: "pass",
      message: `Bucket "${PROPERTY_PHOTOS_BUCKET}" is accessible.`,
      details: { buckets: names.length, photosPublic: true },
      durationMs,
    };
  } catch (err) {
    return {
      id: "storage.buckets",
      name: "Storage bucket accessibility",
      category: "storage",
      severity: "warn",
      message: `Storage probe error: ${err instanceof Error ? err.message : "error"}`,
    };
  }
}

/** 12. Broken API routes (file presence + lightweight self-check) */
export function checkApiRoutes(): HealthCheckResult {
  const requiredRoutes = [
    "app/api/ask/route.ts",
    "app/api/admin/revalidate/route.ts",
    "app/api/system/health/route.ts",
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

/** 14. Invalid Next.js config */
export function checkNextConfig(): HealthCheckResult {
  const configTs = existsSync(join(ROOT, "next.config.ts"));
  const configJs = existsSync(join(ROOT, "next.config.js"));
  const configMjs = existsSync(join(ROOT, "next.config.mjs"));
  if (!configTs && !configJs && !configMjs) {
    return {
      id: "config.next",
      name: "Next.js config",
      category: "config",
      severity: "fail",
      message: "No next.config.* file found.",
      fix: "Restore next.config.ts from the repository.",
    };
  }

  try {
    if (configTs) {
      const raw = readFileSync(join(ROOT, "next.config.ts"), "utf8");
      if (!raw.includes("export default")) {
        return {
          id: "config.next",
          name: "Next.js config",
          category: "config",
          severity: "fail",
          message: "next.config.ts has no default export.",
          fix: "Ensure `export default nextConfig`.",
        };
      }
      const hasTurbopackRoot = raw.includes("turbopack");
      return {
        id: "config.next",
        name: "Next.js config",
        category: "config",
        severity: "pass",
        message: "next.config.ts is present and exports a default config.",
        details: { file: "next.config.ts", turbopackBlock: hasTurbopackRoot },
      };
    }
  } catch (err) {
    return {
      id: "config.next",
      name: "Next.js config",
      category: "config",
      severity: "warn",
      message: `Could not read next.config: ${err instanceof Error ? err.message : "error"}`,
    };
  }

  return {
    id: "config.next",
    name: "Next.js config",
    category: "config",
    severity: "pass",
    message: "Next.js config file found.",
  };
}

/** 15. Build / runtime version mismatch */
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
