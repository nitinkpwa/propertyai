/**
 * Deployed client version — bump on every production release.
 * Prefer NEXT_PUBLIC_APP_VERSION or Vercel git SHA when set.
 */
export const APP_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION?.trim() ||
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  "0.1.1";

/** localStorage key holding the last successful client version */
export const APP_VERSION_STORAGE_KEY = "areaiq_app_version";

/** Prevent infinite reload loops during version recovery */
export const VERSION_RELOAD_GUARD_KEY = "areaiq_version_reload_guard";

/** Prefix for all AreaIQ-owned browser storage keys */
export const AREAIQ_STORAGE_PREFIX = "areaiq";
