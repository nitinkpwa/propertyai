"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ProfileCompletionRing from "@/components/premium/ProfileCompletionRing";
import { useProgressiveProfileOptional } from "@/components/buyer/ProgressiveProfileProvider";
import { useBuyerNotifications } from "@/lib/buyer/notifications";
import { EMERALD } from "@/lib/auth/constants";
import { getInitials } from "@/lib/auth/profile";
import { BUYER_NAV, isBuyerNavActive } from "@/lib/buyer/constants";
import { useAuth } from "@/lib/auth/AuthProvider";

interface BuyerSidebarProps {
  fullName?: string | null;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
  /** desktop = fixed left rail; drawer = fills MobileDrawer panel */
  variant?: "desktop" | "drawer";
}

function NavIcon({ icon }: { icon: (typeof BUYER_NAV)[number]["icon"] }) {
  const props = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.75,
    "aria-hidden": true as const,
  };

  switch (icon) {
    case "dashboard":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "heart":
      return (
        <svg {...props}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      );
    case "compare":
      return (
        <svg {...props}>
          <path d="M16 3h5v5M4 21L20.5 4.5M21 16v5h-5M4 21l5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "crm":
      return (
        <svg {...props}>
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "bell":
      return (
        <svg {...props}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case "user":
      return (
        <svg {...props}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    default:
      return null;
  }
}

export default function BuyerSidebar({
  fullName,
  onCloseMobile,
  onLogout,
  variant = "desktop",
}: BuyerSidebarProps) {
  const pathname = usePathname();
  const initials = getInitials(fullName);
  const profileCtx = useProgressiveProfileOptional();
  const completeness = profileCtx?.completeness.percent ?? 0;
  const { user } = useAuth();
  const { unreadCount } = useBuyerNotifications(user?.id);

  const isDrawer = variant === "drawer";

  return (
    <aside
      className={
        isDrawer
          ? "flex h-full w-full flex-col bg-white"
          : "fixed bottom-0 left-0 top-chrome z-40 flex w-64 flex-col border-r border-neutral-200/80 bg-white shadow-[4px_0_24px_rgba(0,0,0,0.04)]"
      }
    >
      <div className="flex items-start justify-between gap-3 border-b border-neutral-100 p-5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-dark">
            Buyer Portal
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-[0_2px_8px_rgba(74,170,39,0.35)]"
              style={{ backgroundColor: EMERALD }}
            >
              {initials || "B"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-heading-primary">
                {fullName ?? "Buyer"}
              </p>
              <p className="text-xs text-muted">Your workspace</p>
            </div>
          </div>
        </div>
        {isDrawer ? (
          <button
            type="button"
            onClick={onCloseMobile}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-body transition active:scale-[0.98] hover:bg-neutral-50"
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto scroll-touch p-3" aria-label="Buyer dashboard">
        {BUYER_NAV.map((item) => {
          const active = isBuyerNavActive(item.href, pathname);
          const showBadge = item.icon === "bell" && unreadCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex min-h-12 items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200 active:scale-[0.99] ${
                active
                  ? "bg-emerald-50 text-emerald-800 shadow-[inset_0_0_0_1px_rgba(74,170,39,0.15)]"
                  : "text-body hover:bg-neutral-50 hover:text-heading-primary"
              }`}
            >
              <span className={active ? "text-emerald-600" : "text-muted"}>
                <NavIcon icon={item.icon} />
              </span>
              <span className="flex-1">{item.label}</span>
              {showBadge ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-neutral-100 p-3">
        {profileCtx && completeness < 100 ? (
          <button
            type="button"
            onClick={() => {
              profileCtx.openModal();
              onCloseMobile();
            }}
            className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-emerald-50 px-3 py-3 text-left ring-1 ring-emerald-100 transition active:scale-[0.99] hover:bg-emerald-100/80"
          >
            <ProfileCompletionRing percent={completeness} size="sm" showLabel={false} />
            <div>
              <p className="text-xs font-semibold text-emerald-800">Profile {completeness}%</p>
              <p className="text-[10px] text-emerald-600">Tap to complete</p>
            </div>
          </button>
        ) : null}
        <Link
          href="/properties"
          onClick={onCloseMobile}
          className="flex min-h-12 items-center justify-center rounded-2xl border border-neutral-200 px-3 py-3 text-sm font-semibold text-body transition-all active:scale-[0.99] hover:bg-neutral-50"
        >
          Browse Properties
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold text-rose-600 transition-all active:scale-[0.99] hover:bg-rose-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}
