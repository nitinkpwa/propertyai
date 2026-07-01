"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import UserMenu from "./UserMenu";
import Logo from "@/components/common/Logo";
import { useAuth } from "@/lib/auth/AuthProvider";
import { EMERALD } from "@/lib/auth/constants";
import { getProfileDisplayName, getProfileSubtitle, getInitials } from "@/lib/auth/profile";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Buy", href: "/properties?type=buy" },
  { label: "Rent", href: "/properties?type=rent" },
  { label: "Commercial", href: "/properties?type=commercial" },
  { label: "AI Assistant", href: "/ask" },
  {
    label: "Market Insights",
    href: "/ask?q=Latest+market+trends+in+Tricity+2025",
  },
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

function NavLink({
  href,
  label,
  active,
  onNavigate,
  className = "",
  light = false,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
  className?: string;
  light?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`group relative px-3 py-2 text-sm font-medium transition-colors duration-200 ${className} ${
        active
          ? light
            ? "text-white"
            : "text-neutral-900"
          : light
            ? "text-white/70 hover:text-white"
            : "text-neutral-600 hover:text-neutral-900"
      }`}
    >
      {label}
      <span
        className={`absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full transition-all duration-300 ${
          active ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0 group-hover:opacity-60 group-hover:scale-x-100"
        }`}
        style={{ backgroundColor: EMERALD }}
        aria-hidden
      />
    </Link>
  );
}

function NavbarInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, profile, loading, dashboardPath, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHomeHero = pathname === "/" && !scrolled;

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    closeMobile();
  }, [pathname, searchParams, closeMobile]);

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
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-out ${
          scrolled
            ? "border-b border-neutral-200/80 bg-white/95 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.04)] backdrop-blur-xl"
            : isHomeHero
              ? "border-b border-transparent bg-transparent"
              : "border-b border-transparent bg-white/80 backdrop-blur-md"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Left — logo + tagline */}
          <Logo showTagline variant={isHomeHero ? "light" : "default"} priority />

          {/* Center — desktop nav */}
          <nav
            className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 lg:flex"
            aria-label="Main navigation"
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

          {/* Right — actions */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/seller"
              className={`hidden rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200 sm:inline-flex ${
                isHomeHero
                  ? "border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-md"
              }`}
            >
              List Property
            </Link>
            <UserMenu />

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition-colors lg:hidden ${
                isHomeHero
                  ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
                  : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
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

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 bg-neutral-900/20 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeMobile}
        aria-hidden={!mobileOpen}
      />

      {/* Mobile slide-out panel */}
      <aside
        id="mobile-nav"
        className={`fixed right-0 top-0 z-50 flex h-full w-[min(320px,88vw)] flex-col bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div className="flex h-16 items-center justify-between border-b border-neutral-100 px-5">
          <span className="text-base font-semibold text-neutral-900">
            Menu
          </span>
          <button
            type="button"
            onClick={closeMobile}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
            aria-label="Close menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path
                d="M4 4L14 14M14 4L4 14"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-6" aria-label="Mobile navigation">
          {NAV_LINKS.map((link) => {
            const active = isLinkActive(link.href, pathname, searchParams);
            return (
              <Link
                key={link.label}
                href={link.href}
                onClick={closeMobile}
                className={`rounded-xl px-4 py-3 text-[15px] font-medium transition-colors ${
                  active
                    ? "bg-emerald-50 text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                }`}
              >
                <span className="flex items-center gap-3">
                  {active && (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: EMERALD }}
                      aria-hidden
                    />
                  )}
                  {link.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-neutral-100 p-5">
          {!loading && user ? (
            <>
              <div className="flex items-center gap-3 rounded-2xl bg-neutral-50 px-4 py-3">
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: EMERALD }}
                >
                  {getInitials(profile?.full_name, profile?.username ?? profile?.phone)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-900">
                    {getProfileDisplayName(profile, user)}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {getProfileSubtitle(profile)}
                  </p>
                </div>
              </div>
              <Link
                href={dashboardPath}
                onClick={closeMobile}
                className="flex w-full items-center justify-center rounded-full border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 shadow-sm"
              >
                Dashboard
              </Link>
              <Link
                href="/profile"
                onClick={closeMobile}
                className="flex w-full items-center justify-center rounded-full border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 shadow-sm"
              >
                Profile
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  closeMobile();
                  router.push("/");
                  router.refresh();
                }}
                className="flex w-full items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/seller"
                onClick={closeMobile}
                className="flex w-full items-center justify-center rounded-full border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 shadow-sm transition-all hover:border-neutral-300 hover:bg-neutral-50"
              >
                List Property
              </Link>
              <Link
                href="/login"
                onClick={closeMobile}
                className="flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(34,197,94,0.35)]"
                style={{ backgroundColor: EMERALD }}
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </aside>
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
