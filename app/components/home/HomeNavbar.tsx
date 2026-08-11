"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import UserMenu from "../UserMenu";
import MobileNavPanel from "../MobileNavPanel";
import Logo from "@/components/common/Logo";
import { useChromeElement } from "@/components/layout/engine";
import { zClass } from "@/lib/layout/zIndex";
import { useAuth } from "@/lib/auth/AuthProvider";
import { HOME_NAV_LINKS } from "./data";
import { IQ_GREEN } from "./theme";

export default function HomeNavbar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  const chromeRef = useChromeElement("navbar", true, "home-navbar");

  if (pathname !== menuPath) {
    setMenuPath(pathname);
    if (mobileOpen) setMobileOpen(false);
  }

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobile();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeMobile]);

  const solid = scrolled;

  return (
    <>
      <header
        ref={chromeRef}
        data-tour="home-navbar"
        className={`fixed inset-x-0 top-0 ${zClass.dropdown} transition-all duration-500 ${
          solid
            ? "border-b border-neutral-200/80 bg-white/95 shadow-[0_1px_3px_rgba(0,0,0,0.04)] backdrop-blur-xl"
            : "border-b border-white/20 bg-white/40 backdrop-blur-md"
        }`}
      >
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 py-2 pl-6 pr-4 sm:gap-4 sm:pr-6 lg:pr-8">
          <Logo
            size="navbar"
            accentColor={IQ_GREEN}
            lightAccentColor={IQ_GREEN}
            showTagline={false}
            priority
          />

          <nav
            className="hidden items-center gap-1 lg:flex"
            aria-label="Main"
            data-tour="desktop-navigation"
          >
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
              data-tour="list-property"
              className="hidden rounded-full border border-neutral-200/80 bg-white/80 px-4 py-2 text-sm font-medium text-label no-underline shadow-sm transition-all hover:shadow-md sm:inline-flex"
            >
              List Property
            </Link>
            {!loading && !user ? (
              <Link
                href="/login"
                data-tour="sign-in"
                className="hidden rounded-full px-5 py-2 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(74, 170, 39,0.35)] transition-transform hover:scale-[1.02] sm:inline-flex"
                style={{ backgroundColor: IQ_GREEN }}
              >
                Sign In
              </Link>
            ) : (
              <UserMenu />
            )}
            <button
              type="button"
              data-tour="mobile-menu"
              onClick={() => setMobileOpen((o) => !o)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200/80 bg-white/80 lg:hidden"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              <span className="relative h-4 w-5" aria-hidden>
                <span
                  className={`absolute left-0 h-0.5 w-5 rounded-full bg-neutral-800 transition-all duration-300 ${
                    mobileOpen ? "top-2 rotate-45" : "top-0"
                  }`}
                />
                <span
                  className={`absolute left-0 top-2 h-0.5 w-5 rounded-full bg-neutral-800 transition-all duration-300 ${
                    mobileOpen ? "opacity-0" : "opacity-100"
                  }`}
                />
                <span
                  className={`absolute left-0 h-0.5 w-5 rounded-full bg-neutral-800 transition-all duration-300 ${
                    mobileOpen ? "top-2 -rotate-45" : "top-4"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      <MobileNavPanel
        open={mobileOpen}
        onClose={closeMobile}
        accentColor={IQ_GREEN}
      />
    </>
  );
}
