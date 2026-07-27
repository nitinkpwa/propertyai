import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  envPresence,
  safeHostname,
  type HealthCheckResult,
} from "./types";

/**
 * Worker-safe health checks — no filesystem access.
 * Kept separate from FS probes so Turbopack NFT cannot pull the repo into the Worker.
 */

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

/** Required / recommended env vars (presence only). */
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

/** Supabase connectivity */
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

/** OpenAI connectivity (if configured) */
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

/** Cloudflare (if configured) — env presence only */
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

/** Port — process is serving (health endpoint reachable implies bind OK). */
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

/** Node version — process.version only (no package.json / fs). */
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

/** Storage bucket accessibility */
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
