"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/common/Logo";
import { EMERALD } from "@/lib/auth/constants";
import { getInitials } from "@/lib/auth/profile";
import { BUYER_NAV, isBuyerNavActive } from "@/lib/buyer/constants";

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

  return (
    <aside
      className={`fixed bottom-0 left-0 top-16 z-50 flex w-64 flex-col border-r border-neutral-200/80 bg-white shadow-[4px_0_24px_rgba(0,0,0,0.04)] transition-transform duration-300 lg:translate-x-0 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="border-b border-neutral-100 p-5">
        <Logo size="dashboard" href="/" className="mb-4" />
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shadow-[0_2px_8px_rgba(34,197,94,0.35)]"
            style={{ backgroundColor: EMERALD }}
          >
            {initials || "B"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-neutral-900">
              {fullName ?? "Buyer"}
            </p>
            <p className="text-xs text-neutral-500">Buyer Account</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Buyer dashboard">
        {BUYER_NAV.map((item) => {
          const active = isBuyerNavActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-emerald-50 text-emerald-800 shadow-[inset_0_0_0_1px_rgba(34,197,94,0.15)]"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              }`}
            >
              <span className={active ? "text-emerald-600" : "text-neutral-400"}>
                <NavIcon icon={item.icon} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-neutral-100 p-3">
        <Link
          href="/properties"
          onClick={onCloseMobile}
          className="flex items-center justify-center rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-700 transition-all hover:bg-neutral-50"
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
