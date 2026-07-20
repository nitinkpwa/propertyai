"use client";

import { usePathname } from "next/navigation";
import BottomNav from "@/components/layout/BottomNav";
import { PUBLIC_BOTTOM_NAV, isPortalPath } from "@/lib/design/bottomNav";

/**
 * Public (guest/buyer browsing) bottom nav — shown on non-portal routes below lg.
 * Hidden on auth pages and portal dashboards.
 */
export default function PublicBottomNav() {
  const pathname = usePathname();

  if (isPortalPath(pathname)) return null;
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/connect/login") ||
    pathname.startsWith("/property/") ||
    pathname.startsWith("/ask")
  ) {
    return null;
  }

  const activeId =
    PUBLIC_BOTTOM_NAV.find((item) => {
      if (!item.href) return false;
      if (item.href === "/") return pathname === "/";
      return pathname === item.href || pathname.startsWith(`${item.href}/`);
    })?.id ??
    (pathname.startsWith("/property") ? "search" : undefined);

  return <BottomNav items={PUBLIC_BOTTOM_NAV} activeId={activeId} />;
}
