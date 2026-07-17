"use client";

import Link from "next/link";
import { useState } from "react";
import type { SellerTab } from "@/lib/seller/types";
import { getInitials } from "@/lib/seller/constants";

const SIDEBAR_ITEMS: Array<{ key: SellerTab; label: string; icon: string }> = [
  { key: "home", label: "Dashboard", icon: "🏠" },
  { key: "listings", label: "My Properties", icon: "🏢" },
  { key: "add", label: "Add Property", icon: "➕" },
  { key: "leads", label: "Leads", icon: "📩" },
  { key: "visits", label: "Site Visits", icon: "📅" },
  { key: "analytics", label: "Analytics", icon: "📈" },
  { key: "notifications", label: "Notifications", icon: "🔔" },
  { key: "profile", label: "Profile", icon: "👤" },
];

interface SellerShellProps {
  tab: SellerTab;
  onTabChange: (tab: SellerTab) => void;
  userName?: string | null;
  avatarUrl?: string | null;
  newLeads: number;
  unreadNotifications: number;
  refreshing: boolean;
  onLogout: () => void;
  onAddProperty: () => void;
  children: React.ReactNode;
}

export default function SellerShell({
  tab,
  onTabChange,
  userName,
  avatarUrl,
  newLeads,
  unreadNotifications,
  refreshing,
  onLogout,
  onAddProperty,
  children,
}: SellerShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (key: SellerTab) => {
    if (key === "add") onAddProperty();
    else onTabChange(key);
    setMobileOpen(false);
  };

  const sidebar = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {SIDEBAR_ITEMS.map((item) => {
        const active = tab === item.key;
        const badge =
          item.key === "leads" && newLeads > 0
            ? newLeads
            : item.key === "notifications" && unreadNotifications > 0
              ? unreadNotifications
              : 0;

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => handleNav(item.key)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
              active
                ? "bg-emerald-50 text-emerald-800 shadow-sm ring-1 ring-emerald-200/60"
                : "text-body hover:bg-neutral-50 hover:text-heading-primary"
            }`}
          >
            <span className="text-base" aria-hidden>
              {item.icon}
            </span>
            <span className="flex-1">{item.label}</span>
            {badge > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                {badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-16">
      <header className="sticky top-16 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6 lg:pl-[17.5rem] lg:pr-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 text-body lg:hidden"
              aria-label="Open menu"
            >
              ☰
            </button>
            <h1 className="text-sm font-semibold text-heading-primary lg:text-base">
              Seller Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {refreshing ? (
              <span className="hidden text-xs text-muted sm:inline">Refreshing...</span>
            ) : null}
            <button
              type="button"
              onClick={() => onTabChange("notifications")}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-body transition-colors hover:bg-neutral-50"
              aria-label="Notifications"
            >
              🔔
              {unreadNotifications > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-white">
                  {unreadNotifications}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => onTabChange("profile")}
              className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-emerald-500 transition-all hover:ring-2 hover:ring-emerald-200"
              aria-label="Profile"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-white">{getInitials(userName)}</span>
              )}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="hidden rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-body transition-colors hover:bg-neutral-50 sm:inline-flex"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="fixed bottom-0 left-0 top-[7.5rem] hidden w-64 flex-col border-r border-neutral-200 bg-white lg:flex">
          <div className="border-b border-neutral-100 px-4 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-dark">
              Seller Portal
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-heading-primary">
              {userName ?? "Seller"}
            </p>
          </div>
          {sidebar}
        </aside>

        {mobileOpen ? (
          <>
            <div
              className="fixed inset-0 z-40 bg-neutral-900/20 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <aside className="fixed bottom-0 left-0 top-0 z-50 flex w-[min(280px,88vw)] flex-col bg-white shadow-xl lg:hidden">
              <div className="flex h-16 items-center justify-between border-b border-neutral-100 px-4">
                <span className="font-semibold text-heading-primary">Menu</span>
                <button type="button" onClick={() => setMobileOpen(false)} className="text-muted">
                  ✕
                </button>
              </div>
              {sidebar}
              <div className="border-t border-neutral-100 p-4">
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-medium text-red-600"
                >
                  Logout
                </button>
              </div>
            </aside>
          </>
        ) : null}

        <main className="min-h-[calc(100vh-4rem)] flex-1 px-4 py-6 sm:px-6 lg:ml-64 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
