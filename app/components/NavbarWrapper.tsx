"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import Navbar from "./Navbar";
import PublicBottomNav from "@/components/layout/PublicBottomNav";
import NotificationBar from "@/components/notifications/NotificationBar";
import FeatureErrorBoundary from "@/components/stability/FeatureErrorBoundary";
import { isPortalPath } from "@/lib/design/bottomNav";

function NavbarWrapperInner() {
  const pathname = usePathname();

  // Home uses HomeNavbar + its own NotificationBar.
  if (pathname === "/") {
    return <PublicBottomNav />;
  }

  // Portal + Ask: navbar + smart bar on desktop only (mobile shells own chrome).
  if (isPortalPath(pathname) || pathname.startsWith("/ask")) {
    return (
      <div className="hidden lg:block">
        <Navbar />
        <FeatureErrorBoundary name="Intelligence bar" compact>
          <NotificationBar variant="fixed" />
        </FeatureErrorBoundary>
      </div>
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
