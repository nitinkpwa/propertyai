"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import Navbar from "./Navbar";
import PublicBottomNav from "@/components/layout/PublicBottomNav";
import { isPortalPath } from "@/lib/design/bottomNav";

function NavbarWrapperInner() {
  const pathname = usePathname();

  // Home uses HomeNavbar.
  if (pathname === "/") {
    return <PublicBottomNav />;
  }

  // Portal routes: hide global navbar on mobile (shells own chrome); keep on desktop.
  if (isPortalPath(pathname)) {
    return (
      <div className="hidden lg:block">
        <Navbar />
      </div>
    );
  }

  return (
    <>
      <Navbar />
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
