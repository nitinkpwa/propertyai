/**
 * Pending auth intent — survives login/signup/OAuth across tabs via localStorage.
 * Only set when a protected action redirects to auth (not navbar Sign In).
 */

import { sanitizeRedirectPath } from "@/lib/auth/routes";

export type PendingAuthAction =
  | "book_visit"
  | "save_property"
  | "compare"
  | "contact_seller"
  | "ask_areaiq"
  | "request_callback"
  | "download_brochure"
  | "share_inquiry";

export interface PendingAuthIntent {
  action: PendingAuthAction;
  propertyId: string | null;
  returnUrl: string;
  createdAt: number;
}

const STORAGE_KEY = "areaiq_pending_auth_intent_v1";
const TTL_MS = 30 * 60 * 1000; // 30 minutes

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function savePendingAuthIntent(
  input: Omit<PendingAuthIntent, "createdAt" | "returnUrl"> & { returnUrl?: string },
): PendingAuthIntent {
  const returnUrl = sanitizeRedirectPath(
    input.returnUrl ||
      (typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/"),
    "/",
  );

  const intent: PendingAuthIntent = {
    action: input.action,
    propertyId: input.propertyId,
    returnUrl,
    createdAt: Date.now(),
  };

  if (canUseStorage()) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
      // Mirror to sessionStorage for same-tab resilience
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
    } catch {
      /* quota / private mode */
    }
  }

  return intent;
}

export function getPendingAuthIntent(): PendingAuthIntent | null {
  if (!canUseStorage()) return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingAuthIntent;
    if (!parsed?.action || !parsed?.returnUrl || !parsed?.createdAt) {
      clearPendingAuthIntent();
      return null;
    }
    if (Date.now() - parsed.createdAt > TTL_MS) {
      clearPendingAuthIntent();
      return null;
    }
    parsed.returnUrl = sanitizeRedirectPath(parsed.returnUrl, "/");
    return parsed;
  } catch {
    clearPendingAuthIntent();
    return null;
  }
}

export function clearPendingAuthIntent(): void {
  if (!canUseStorage()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Manual navbar login should not restore a stale protected-action intent.
 * Call when /login or /register loads without an explicit redirect query.
 */
export function clearPendingAuthIntentIfManualLogin(hasRedirectQuery: boolean): void {
  if (!hasRedirectQuery) {
    clearPendingAuthIntent();
  }
}

/** Build login URL and persist intent first. */
export function buildLoginUrlWithIntent(params: {
  action: PendingAuthAction;
  propertyId?: string | null;
  returnUrl?: string;
}): string {
  const intent = savePendingAuthIntent({
    action: params.action,
    propertyId: params.propertyId ?? null,
    returnUrl: params.returnUrl,
  });
  return `/login?redirect=${encodeURIComponent(intent.returnUrl)}`;
}

/**
 * Post auth destination: prefer pending intent returnUrl, then ?redirect=, then dashboard.
 * Does NOT clear the intent — resume handlers clear after the action completes.
 */
export function resolvePostAuthDestination(
  roleDashboard: string,
  redirectParam?: string | null,
): string {
  const intent = getPendingAuthIntent();
  if (intent?.returnUrl) {
    return sanitizeRedirectPath(intent.returnUrl, roleDashboard);
  }
  if (redirectParam) {
    return sanitizeRedirectPath(redirectParam, roleDashboard);
  }
  return roleDashboard;
}

/** True when a resume handler on a property page should run. */
export function matchPendingIntentForProperty(
  propertyId: string,
  action?: PendingAuthAction,
): PendingAuthIntent | null {
  const intent = getPendingAuthIntent();
  if (!intent) return null;
  if (intent.propertyId && intent.propertyId !== propertyId) return null;
  if (action && intent.action !== action) return null;
  return intent;
}
