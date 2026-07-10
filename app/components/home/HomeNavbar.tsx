"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import UserMenu from "../UserMenu";
import Logo from "@/components/common/Logo";
import { useAuth } from "@/lib/auth/AuthProvider";
import { HOME_NAV_LINKS } from "./data";
import { IQ_GREEN } from "./theme";

export default function HomeNavbar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const solid = scrolled;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-9 z-50 transition-all duration-500 ${
          solid
            ? "border-b border-neutral-200/80 bg-white/95 shadow-[0_1px_3px_rgba(0,0,0,0.04)] backdrop-blur-xl"
            : "border-b border-white/20 bg-white/40 backdrop-blur-md"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Logo accentColor={IQ_GREEN} lightAccentColor={IQ_GREEN} priority />

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {HOME_NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-xl px-4 py-2 text-sm font-medium text-body no-underline transition-all hover:bg-white/80 hover:text-heading-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/seller"
              className="hidden rounded-full border border-neutral-200/80 bg-white/80 px-4 py-2 text-sm font-medium text-label no-underline shadow-sm transition-all hover:shadow-md sm:inline-flex"
            >
              List Property
            </Link>
            {!loading && !user ? (
              <Link
                href="/login"
                className="hidden rounded-full px-5 py-2 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(22,199,132,0.35)] transition-transform hover:scale-[1.02] sm:inline-flex"
                style={{ backgroundColor: IQ_GREEN }}
              >
                Sign In
              </Link>
            ) : (
              <UserMenu />
            )}
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200/80 bg-white/80 lg:hidden"
              aria-label="Menu"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-x-0 top-[100px] z-40 border-b border-neutral-200 bg-white p-4 shadow-lg lg:hidden">
          <nav className="flex flex-col gap-1">
            {HOME_NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-xl px-4 py-3 text-sm font-medium text-label no-underline hover:bg-[#F7F9FB]"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/seller" className="rounded-xl px-4 py-3 text-sm font-medium text-label no-underline hover:bg-[#F7F9FB]">
              List Property
            </Link>
            {!user ? (
              <Link
                href="/login"
                className="mt-2 rounded-xl py-3 text-center text-sm font-semibold text-white"
                style={{ backgroundColor: IQ_GREEN }}
              >
                Sign In
              </Link>
            ) : null}
          </nav>
        </div>
      ) : null}
    </>
  );
}
