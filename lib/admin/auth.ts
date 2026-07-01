/**
 * MVP admin gate — hardcoded credentials + sessionStorage session.
 *
 * TODO(production): Remove hardcoded credentials and use Supabase profiles.role = 'admin'
 * with server-side middleware protection instead of client sessionStorage.
 */

export const ADMIN_USERNAME = "admin";
export const ADMIN_PASSWORD = "propertyai2025";
export const ADMIN_SESSION_KEY = "admin_auth";

export function isAdminSessionActive(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";
}

export function setAdminSession(active: boolean): void {
  if (typeof window === "undefined") return;
  if (active) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
  } else {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  }
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  return (
    username.trim() === ADMIN_USERNAME &&
    password === ADMIN_PASSWORD
  );
}
