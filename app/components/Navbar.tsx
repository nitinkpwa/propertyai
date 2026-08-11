"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import UserMenu from "./UserMenu";
import MobileNavPanel from "./MobileNavPanel";
import Logo from "@/components/common/Logo";
import { useChromeElement } from "@/components/layout/engine";
import { zClass } from "@/lib/layout/zIndex";
const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Buy", href: "/properties?type=buy" },
  { label: "Rent", href: "/properties?type=rent" },
  { label: "Commercial", href: "/properties?type=commercial" },
  { label: "Intelligence Map", href: "/intelligence-map" },
  { label: "AreaIQ Intelligence", href: "/ask" },
] as const;

function isLinkActive(
  href: string,
  pathname: string,
  searchParams: URLSearchParams,
): boolean {
  const [path, query = ""] = href.split("?");
  const linkParams = new URLSearchParams(query);

  if (pathname !== path) return false;
  if (!query) {
    if (path === "/ask") {
      const q = searchParams.get("q") ?? "";
      return !q.toLowerCase().includes("market");
    }
    return path === "/" || searchParams.toString() === "";
  }

  for (const [key, value] of linkParams.entries()) {
    if (searchParams.get(key) !== value) return false;
  }
  return true;
}

const INDICATOR_TRANSITION = {
  duration: 0.25,
  ease: [0.22, 1, 0.36, 1] as const,
};

function NavLink({
  href,
  label,
  active,
  light = false,
}: {
  href: string;
  label: string;
  active: boolean;
  light?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative px-3 py-2 text-sm transition-colors duration-200 ${
        active
          ? light
            ? "font-semibold text-white"
            : "font-semibold text-heading-primary"
          : light
            ? "font-medium text-white/70 hover:text-white"
            : "font-medium text-body hover:text-heading-primary"
      }`}
    >
      {label}
      {active ? (
        <span
          className="pointer-events-none absolute inset-x-0 -bottom-3 flex justify-center"
          aria-hidden
        >
          <motion.span
            layoutId="navbar-active-indicator"
            transition={INDICATOR_TRANSITION}
            className="h-[3px] w-full min-w-[60px] max-w-[90px] rounded-full"
            style={
              light
                ? {
                    background:
                      "linear-gradient(90deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0.3) 100%)",
                    boxShadow: "0 2px 10px rgba(255,255,255,0.32)",
                  }
                : {
                    background:
                      "linear-gradient(90deg, rgba(74,170,39,0.3) 0%, #4AAA27 42%, #5BBF35 62%, rgba(74,170,39,0.3) 100%)",
                    boxShadow:
                      "0 2px 10px rgba(74,170,39,0.26), 0 1px 3px rgba(74,170,39,0.16)",
                  }
            }
          />
        </span>
      ) : null}
    </Link>
  );
}

function NavbarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  const isHomeHero = pathname === "/" && !scrolled;
  const chromeRef = useChromeElement("navbar", true, "global-navbar");

  if (pathname !== menuPath) {
    setMenuPath(pathname);
    if (mobileOpen) setMobileOpen(false);
  }

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
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

  return (
    <>
      <header
        ref={chromeRef}
        className={`fixed inset-x-0 top-0 ${zClass.dropdown} transition-all duration-500 ease-out ${
          scrolled
            ? "border-b border-neutral-200/80 bg-white/95 shadow-[0_1px_3px_rgba(0,0,0,0.04)] backdrop-blur-xl"
            : isHomeHero
              ? "border-b border-transparent bg-transparent"
              : "border-b border-neutral-200/60 bg-white/95 backdrop-blur-xl"
        }`}
      >
        <div className="relative mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 pb-2 pl-6 pr-4 pt-2 sm:gap-4 sm:pr-6 lg:min-h-[76px] lg:pb-5 lg:pr-8">
          <Logo
            size="navbar"
            showTagline={false}
            variant={isHomeHero ? "light" : "default"}
            priority
          />

          <nav
            className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 overflow-visible lg:flex"
            aria-label="Main navigation"
            data-tour="desktop-navigation"
          >
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.label}
                href={link.href}
                label={link.label}
                active={isLinkActive(link.href, pathname, searchParams)}
                light={isHomeHero}
              />
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/seller"
              data-tour="list-property"
              className={`hidden rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200 sm:inline-flex ${
                isHomeHero
                  ? "border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                  : "border-neutral-200 bg-white text-body hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-md"
              }`}
            >
              List Property
            </Link>
            <UserMenu />

            <button
              type="button"
              data-tour="mobile-menu"
              onClick={() => setMobileOpen((open) => !open)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition-colors lg:hidden ${
                isHomeHero
                  ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
                  : "border-neutral-200 bg-white text-body hover:bg-neutral-50"
              }`}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              <span className="relative h-4 w-5">
                <span
                  className={`absolute left-0 h-0.5 w-5 rounded-full transition-all duration-300 ${
                    mobileOpen ? "top-2 rotate-45" : "top-0"
                  } ${isHomeHero ? "bg-white" : "bg-neutral-800"}`}
                />
                <span
                  className={`absolute left-0 top-2 h-0.5 w-5 rounded-full transition-all duration-300 ${
                    mobileOpen ? "opacity-0" : "opacity-100"
                  } ${isHomeHero ? "bg-white" : "bg-neutral-800"}`}
                />
                <span
                  className={`absolute left-0 h-0.5 w-5 rounded-full transition-all duration-300 ${
                    mobileOpen ? "top-2 -rotate-45" : "top-4"
                  } ${isHomeHero ? "bg-white" : "bg-neutral-800"}`}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      <MobileNavPanel open={mobileOpen} onClose={closeMobile} />
    </>
  );
}

function NavbarFallback() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-transparent bg-transparent">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo href="/" />
      </div>
    </header>
  );
}

export default function Navbar() {
  return (
    <Suspense fallback={<NavbarFallback />}>
      <NavbarInner />
    </Suspense>
  );
}
