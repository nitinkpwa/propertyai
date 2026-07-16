"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { EMERALD } from "@/lib/auth/constants";
import {
  getMobileNavItems,
  getRoleDisplayLabel,
} from "@/lib/auth/mobileNav";
import {
  getInitials,
  getProfileDisplayName,
} from "@/lib/auth/profile";

type MobileNavPanelProps = {
  open: boolean;
  onClose: () => void;
  /** Optional accent for homepage green. Defaults to auth emerald. */
  accentColor?: string;
};

export default function MobileNavPanel({
  open,
  onClose,
  accentColor = EMERALD,
}: MobileNavPanelProps) {
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();
  const role = profile?.role ?? null;
  const items = getMobileNavItems(loading ? null : role);
  const showProfile = Boolean(!loading && user && role);

  const handleLogout = async () => {
    await signOut();
    onClose();
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-neutral-900/20 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        id="mobile-nav"
        className={`fixed right-0 top-0 z-50 flex h-full w-[min(320px,88vw)] flex-col bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-out lg:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
        aria-label="Mobile navigation"
      >
        <div className="flex h-16 items-center justify-between border-b border-neutral-100 px-5">
          <span className="text-base font-semibold text-heading-primary">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-neutral-100 hover:text-heading-secondary"
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

        {showProfile ? (
          <div className="border-b border-neutral-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: accentColor }}
                aria-hidden
              >
                {getInitials(profile?.full_name, profile?.username ?? profile?.phone)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-heading-primary">
                  {getProfileDisplayName(profile, user)}
                </p>
                <p className="truncate text-xs font-medium text-emerald-700">
                  {getRoleDisplayLabel(role)}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <nav
          className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-4"
          aria-label="Mobile navigation links"
        >
          {items.map((item) => {
            if (item.action === "logout") {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={handleLogout}
                  className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-[15px] font-semibold text-rose-600 transition-colors hover:bg-rose-100"
                >
                  {item.label}
                </button>
              );
            }

            if (!item.href) return null;

            if (item.highlight) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onClose}
                  className="mb-1 flex min-h-12 items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-[15px] font-semibold text-emerald-900 shadow-sm transition-colors hover:bg-emerald-100"
                >
                  <span className="text-lg leading-none" aria-hidden>
                    {item.icon ?? "📊"}
                  </span>
                  {item.label}
                </Link>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onClose}
                className="rounded-xl px-4 py-3 text-[15px] font-medium text-body transition-colors hover:bg-neutral-50 hover:text-heading-primary"
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
