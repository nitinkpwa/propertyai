"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { EMERALD } from "@/lib/auth/constants";
import { getInitials } from "@/lib/auth/profile";

export default function UserMenu() {
  const router = useRouter();
  const { user, profile, loading, dashboardPath, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="hidden h-10 w-24 animate-pulse rounded-full bg-neutral-200 sm:block" />
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="hidden rounded-full px-5 py-2 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(34,197,94,0.35)] transition-all duration-200 hover:shadow-[0_4px_14px_rgba(34,197,94,0.45)] hover:brightness-105 sm:inline-flex"
        style={{ backgroundColor: EMERALD }}
      >
        Sign In
      </Link>
    );
  }

  const displayName = profile?.full_name || user.email?.split("@")[0] || "User";
  const initials = getInitials(profile?.full_name, user.email);

  return (
    <div className="relative hidden sm:block" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white py-1.5 pl-1.5 pr-3 shadow-sm transition-all hover:border-neutral-300 hover:shadow-md"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={displayName}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: EMERALD }}
          >
            {initials}
          </span>
        )}
        <span className="max-w-[120px] truncate text-sm font-medium text-neutral-800">
          {displayName}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          className={`text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 overflow-hidden rounded-2xl border border-neutral-200 bg-white py-2 shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
        >
          <div className="border-b border-neutral-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-neutral-900">
              {displayName}
            </p>
            <p className="truncate text-xs text-neutral-500">{user.email}</p>
          </div>

          {[
            { label: "Dashboard", href: dashboardPath },
            { label: "Saved Properties", href: "/buyer" },
            { label: "Profile", href: "/profile" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
            >
              {item.label}
            </Link>
          ))}

          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="block w-full px-4 py-2.5 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
          >
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}
