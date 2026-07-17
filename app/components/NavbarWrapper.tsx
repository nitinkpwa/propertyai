"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import Navbar from "./Navbar";

function NavbarWrapperInner() {
  const pathname = usePathname();

  // Home uses HomeNavbar. Everywhere else gets the global AreaIQ navbar (single logo).
  if (pathname === "/") {
    return null;
  }

  return <Navbar />;
}

export default function NavbarWrapper() {
  return (
    <Suspense fallback={null}>
      <NavbarWrapperInner />
    </Suspense>
  );
}
