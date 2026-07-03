import { isAdminRole } from "@/lib/auth/admin";
import type { Profile } from "@/lib/supabase";

export function getDashboardPath(role?: Profile["role"] | string | null): string {
  if (isAdminRole(role)) return "/admin";
  switch (role) {
    case "seller":
      return "/seller";
    case "builder":
      return "/connect/dashboard";
    default:
      return "/buyer";
  }
}

/** Returns a redirect path if the role may not access pathname, otherwise null. */
export function getUnauthorizedRedirect(
  role: Profile["role"] | string | null | undefined,
  pathname: string,
): string | null {
  if (!role) return "/login";
  if (isAdminRole(role)) return null;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return getDashboardPath(role);
  }

  if (pathname === "/buyer" || pathname.startsWith("/buyer/")) {
    if (role !== "buyer") return getDashboardPath(role);
  }

  if (pathname === "/seller" || pathname.startsWith("/seller/")) {
    if (role !== "seller") return getDashboardPath(role);
  }

  if (pathname === "/connect/dashboard" || pathname.startsWith("/connect/dashboard/")) {
    if (role !== "builder") return getDashboardPath(role);
  }

  if (pathname === "/builder" || pathname.startsWith("/builder/")) {
    if (role === "builder") return "/connect/dashboard";
    if (role !== "admin") return getDashboardPath(role);
  }

  return null;
}
