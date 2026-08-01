"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import Navbar from "./Navbar";
import PublicBottomNav from "@/components/layout/PublicBottomNav";
import { useViewport } from "@/components/layout/engine";
import NotificationBar from "@/components/notifications/NotificationBar";
import FeatureErrorBoundary from "@/components/stability/FeatureErrorBoundary";
import { isPortalPath } from "@/lib/design/bottomNav";

function NavbarWrapperInner() {
  const pathname = usePathname();
  const { isDesktop } = useViewport();

  // Home uses HomeNavbar + its own NotificationBar.
  if (pathname === "/") {
    return <PublicBottomNav />;
  }

  // Admin CRM uses its own full-width shell — no public website navbar.
  if (pathname.startsWith("/admin")) {
    return null;
  }

  // Portal (buyer/seller/builder) + Ask: desktop chrome only.
  // Buyer portal uses CRM NotificationBell only — skip intelligence bar to avoid duplicate bells.
  if (
    isPortalPath(pathname) ||
    pathname.startsWith("/ask") ||
    pathname.startsWith("/intelligence-map")
  ) {
    if (!isDesktop) return null;
    if (pathname.startsWith("/buyer")) {
      return <Navbar />;
    }
    return (
      <>
        <Navbar />
        <FeatureErrorBoundary name="Intelligence bar" compact>
          <NotificationBar variant="fixed" />
        </FeatureErrorBoundary>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <FeatureErrorBoundary name="Intelligence bar" compact>
        <NotificationBar variant="fixed" />
      </FeatureErrorBoundary>
      <PublicBottomNav />
    </>
  );
}

export default function NavbarWrapper() {
  return (
    <Suspense fallback={null}>
      <NavbarWrapperInner />
    </Suspense>
  );
}
