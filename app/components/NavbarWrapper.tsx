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

  // Portal + Ask: desktop chrome only (mobile shells own MobileTopBar + sticky bar).
  // Mount only on desktop so hidden chrome cannot pollute --chrome-top measurements.
  if (isPortalPath(pathname) || pathname.startsWith("/ask")) {
    if (!isDesktop) return null;
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
