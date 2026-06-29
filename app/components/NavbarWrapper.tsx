"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import Navbar from "./Navbar";
import { isAuthRoute } from "@/lib/auth/constants";

function NavbarWrapperInner() {
  const pathname = usePathname();

  if (isAuthRoute(pathname) || pathname.startsWith("/seller") || pathname.startsWith("/connect/dashboard")) {
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
