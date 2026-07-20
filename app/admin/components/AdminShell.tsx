"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AdminTab } from "@/lib/admin/types";
import BottomNav from "@/components/layout/BottomNav";
import MobileTopBar from "@/components/layout/MobileTopBar";
import MenuSheet from "@/components/layout/MenuSheet";
import { ADMIN_BOTTOM_NAV, type BottomNavItem } from "@/lib/design/bottomNav";

export interface AdminNavItem {
  key: AdminTab;
  label: string;
  icon: string;
  count?: number;
}

interface AdminShellProps {
  tab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  navItems: AdminNavItem[];
  onLogout: () => void;
  children: React.ReactNode;
}

const PRIMARY_TABS = new Set(["dashboard", "properties", "leads", "visits"]);

export default function AdminShell({
  tab,
  onTabChange,
  navItems,
  onLogout,
  children,
}: AdminShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [tabletOpen, setTabletOpen] = useState(false);

  const activeBottomId =
    ADMIN_BOTTOM_NAV.find((i) => i.tab === tab)?.id ??
    (PRIMARY_TABS.has(tab) ? tab : "menu");

  const overflowItems = useMemo(
    () =>
      navItems
        .filter((i) => !PRIMARY_TABS.has(i.key))
        .map((i) => ({
          id: i.key,
          label: i.label,
          icon: i.icon,
          badge: i.count,
        })),
    [navItems],
  );

  const handleBottomSelect = (item: BottomNavItem) => {
    if (item.action === "menu") {
      setMenuOpen(true);
      return;
    }
    if (item.tab) onTabChange(item.tab as AdminTab);
  };

  const sidebar = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {navItems.map((item) => {
        const active = tab === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              onTabChange(item.key);
              setTabletOpen(false);
            }}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${
              active
                ? "bg-emerald-50 text-emerald-800 shadow-sm ring-1 ring-emerald-200/60"
                : "text-body hover:bg-neutral-50 hover:text-heading-primary"
            }`}
          >
            <span aria-hidden>{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.count !== undefined ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-100 px-1.5 text-xs font-bold text-body">
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] lg:pt-16">
      {/* Mobile top bar */}
      <MobileTopBar
        title="Admin"
        showLogo
        onMenu={() => setMenuOpen(true)}
        searchHref="/admin?tab=properties"
        profileHref="/admin?tab=settings"
      />

      {/* Desktop/tablet secondary header */}
      <header className="sticky top-16 z-30 hidden border-b border-neutral-200 bg-white/95 backdrop-blur-xl md:block">
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6 lg:pl-[17.5rem] lg:pr-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTabletOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 lg:hidden"
              aria-label="Open menu"
            >
              ☰
            </button>
            <h1 className="text-sm font-semibold text-heading-primary lg:text-base">
              Admin Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="hidden text-xs font-medium text-label hover:text-heading-secondary sm:inline"
            >
              View Website ↗
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-body hover:bg-neutral-50"
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
              Admin Portal
            </p>
            <p className="mt-1 text-sm font-semibold text-heading-primary">Control Panel</p>
          </div>
          {sidebar}
        </aside>

        {tabletOpen ? (
          <>
            <div
              className="fixed inset-0 z-40 bg-neutral-900/20 backdrop-blur-sm lg:hidden"
              onClick={() => setTabletOpen(false)}
              aria-hidden
            />
            <aside className="fixed bottom-0 left-0 top-0 z-50 flex w-[min(280px,88vw)] flex-col bg-white shadow-xl lg:hidden">
              <div className="flex h-16 items-center justify-between border-b border-neutral-100 px-4">
                <span className="font-semibold text-heading-primary">Menu</span>
                <button type="button" onClick={() => setTabletOpen(false)} className="text-muted">
                  ✕
                </button>
              </div>
              {sidebar}
            </aside>
          </>
        ) : null}

        <main className="min-h-[calc(100vh-4rem)] flex-1 px-4 py-6 pb-nav sm:px-6 lg:ml-64 lg:px-8 lg:py-8 lg:pb-8">
          <div className="mx-auto max-w-7xl animate-page-enter">{children}</div>
        </main>
      </div>

      <BottomNav
        items={ADMIN_BOTTOM_NAV}
        activeId={activeBottomId}
        onItemSelect={handleBottomSelect}
      />

      <MenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Admin menu"
        items={[
          ...overflowItems,
          { id: "__logout", label: "Logout", danger: true },
        ]}
        onSelect={(id) => {
          if (id === "__logout") onLogout();
          else onTabChange(id as AdminTab);
        }}
      />
    </div>
  );
}
