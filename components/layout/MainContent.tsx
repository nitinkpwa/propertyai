"use client";

import { usePathname } from "next/navigation";
import { isPortalPath } from "@/lib/design/bottomNav";

const NO_PAD = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/connect/login",
];

export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const skip =
    isPortalPath(pathname) ||
    NO_PAD.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith("/property/") ||
    pathname.startsWith("/ask");

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${skip ? "" : "pb-nav lg:pb-0"}`}>
      {children}
    </div>
  );
}
