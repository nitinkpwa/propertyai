"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/common/Logo";
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
}

function NavIcon({ icon }: { icon: (typeof BUYER_NAV)[number]["icon"] }) {
  const props = {
    width: 18,
    height: 18,
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
  mobileOpen,
  onCloseMobile,
  onLogout,
}: BuyerSidebarProps) {
  const pathname = usePathname();
  const initials = getInitials(fullName);
  const profileCtx = useProgressiveProfileOptional();
  const completeness = profileCtx?.completeness.percent ?? 0;
  const { user } = useAuth();
  const { unreadCount } = useBuyerNotifications(user?.id);

  return (
    <aside
      className={`fixed bottom-0 left-0 top-0 z-50 flex w-64 flex-col border-r border-neutral-200/80 bg-white shadow-[4px_0_24px_rgba(0,0,0,0.04)] transition-transform duration-300 lg:translate-x-0 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="border-b border-neutral-100 p-5">
        <Logo size="dashboard" href="/buyer" className="mb-4" />
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shadow-[0_2px_8px_rgba(34,197,94,0.35)]"
            style={{ backgroundColor: EMERALD }}
          >
            {initials || "B"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-heading-primary">
              {fullName ?? "Buyer"}
            </p>
            <p className="text-xs text-muted">Buyer Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Buyer dashboard">
        {BUYER_NAV.map((item) => {
          const active = isBuyerNavActive(item.href, pathname);
          const showBadge = item.icon === "bell" && unreadCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-emerald-50 text-emerald-800 shadow-[inset_0_0_0_1px_rgba(34,197,94,0.15)]"
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
            onClick={() => profileCtx.openModal()}
            className="flex w-full items-center gap-3 rounded-xl bg-emerald-50 px-3 py-2.5 text-left ring-1 ring-emerald-100 transition hover:bg-emerald-100/80"
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
          className="flex items-center justify-center rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-body transition-all hover:bg-neutral-50"
        >
          Browse Properties
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 transition-all hover:bg-rose-50"
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
