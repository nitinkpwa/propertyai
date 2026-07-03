import { getSiteUrl } from "@/lib/supabase";

/**
 * Add these exact URLs in Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:
 *
 * - {origin}/auth/callback
 * - {origin}/auth/confirm
 *
 * Site URL should be: {origin}
 */
export function getRequiredSupabaseRedirectUrls(origin = getSiteUrl()): string[] {
  return [`${origin}/auth/callback`, `${origin}/auth/confirm`];
}

/** PKCE / OAuth callback — exchanges ?code= for a cookie session (required for @supabase/ssr). */
export function buildAuthCallbackUrl(next = "/buyer"): string {
  const origin = getSiteUrl();
  const nextPath = next.startsWith("/") ? next : `/${next}`;
  return `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}

/** Password recovery must go through the auth callback, not directly to /reset-password. */
export function buildPasswordRecoveryRedirectUrl(): string {
  return buildAuthCallbackUrl("/reset-password");
}

/** OTP / token_hash email links (alternate Supabase email template format). */
export function buildAuthConfirmUrl(next = "/reset-password"): string {
  const origin = getSiteUrl();
  const nextPath = next.startsWith("/") ? next : `/${next}`;
  return `${origin}/auth/confirm?next=${encodeURIComponent(nextPath)}`;
}
