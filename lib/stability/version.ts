/**
 * Deployed client version — must change on every production deploy
 * so existing browsers can detect stale chunks and recover.
 *
 * Precedence:
 * 1. NEXT_PUBLIC_APP_VERSION (injected via next.config / CI)
 * 2. NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
 * 3. Fallback package-aligned stamp (bump when shipping stability fixes)
 */
export const APP_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION?.trim() ||
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  "0.1.2-stability";

/** localStorage key holding the last successful client version */
export const APP_VERSION_STORAGE_KEY = "areaiq_app_version";

/** Prevent infinite reload loops during version recovery */
export const VERSION_RELOAD_GUARD_KEY = "areaiq_version_reload_guard";

/** Prefix for all AreaIQ-owned browser storage keys */
export const AREAIQ_STORAGE_PREFIX = "areaiq";
