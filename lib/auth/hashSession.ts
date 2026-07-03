import type { AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export type AuthHashResult = {
  event: AuthChangeEvent | "HASH_SESSION";
  type: string | null;
  success: boolean;
  error: string | null;
  errorCode: string | null;
};

function clearUrlHash(): void {
  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState({}, document.title, cleanUrl);
}

/**
 * Implicit-flow tokens arrive in the URL hash (#access_token=...).
 * Errors also arrive in the hash (#error=access_denied&error_code=otp_expired).
 * The server never sees them — handle entirely on the client.
 */
export async function handleAuthHashFragment(): Promise<AuthHashResult> {
  if (typeof window === "undefined") {
    return { event: "HASH_SESSION", type: null, success: false, error: null, errorCode: null };
  }

  const hash = window.location.hash;
  if (!hash || hash.length <= 1) {
    return { event: "HASH_SESSION", type: null, success: false, error: null, errorCode: null };
  }

  const params = new URLSearchParams(hash.slice(1));
  const type = params.get("type");
  const error = params.get("error");
  const errorCode = params.get("error_code") ?? params.get("error_description");

  if (error) {
    clearUrlHash();
    return {
      event: "HASH_SESSION",
      type,
      success: false,
      error,
      errorCode,
    };
  }

  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");

  if (!access_token || !refresh_token) {
    clearUrlHash();
    return { event: "HASH_SESSION", type, success: false, error: null, errorCode: null };
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });

  clearUrlHash();

  return {
    event: "HASH_SESSION",
    type,
    success: !sessionError,
    error: sessionError?.message ?? null,
    errorCode: sessionError ? "session_failed" : null,
  };
}

export function isRecoveryType(type: string | null | undefined): boolean {
  return type === "recovery";
}
