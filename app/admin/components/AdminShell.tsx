"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AdminTab } from "@/lib/admin/types";
import BottomNav from "@/components/layout/BottomNav";
import MobileTopBar from "@/components/layout/MobileTopBar";
import MenuSheet from "@/components/layout/MenuSheet";
import NotificationBar from "@/components/notifications/NotificationBar";
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
  onAddProperty?: () => void;
  children: React.ReactNode;
}

const PRIMARY_TABS = new Set(["dashboard", "properties", "leads", "visits"]);

/** Desktop sidebar width (256px). */
const SIDEBAR_W_CLASS = "w-64";
const SIDEBAR_ML_CLASS = "lg:ml-64";

export default function AdminShell({
  tab,
  onTabChange,
  navItems,
  onLogout,
  onAddProperty,
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

  const activeLabel = navItems.find((i) => i.key === tab)?.label ?? "Admin";

  const sidebar = (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
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
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all ${
              active
                ? "bg-emerald-50 text-emerald-800 shadow-sm ring-1 ring-emerald-200/60"
                : "text-body hover:bg-neutral-50 hover:text-heading-primary"
            }`}
          >
            <span aria-hidden className="w-5 text-center">
              {item.icon}
            </span>
            <span className="flex-1 truncate">{item.label}</span>
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
    <div className="admin-shell flex min-h-dvh flex-col overflow-x-clip bg-[#F7F8FA] lg:h-dvh lg:max-h-dvh lg:overflow-hidden">
      {/* Mobile top bar */}
      <div className="shrink-0 lg:hidden">
        <MobileTopBar
          title="Admin"
          showLogo
          onMenu={() => setMenuOpen(true)}
          searchHref="/admin?tab=properties"
          profileHref="/admin?tab=settings"
          rightSlot={
            onAddProperty ? (
              <button
                type="button"
                onClick={onAddProperty}
                className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-xs font-semibold text-white"
                aria-label="Add Property"
              >
                <span aria-hidden>+</span>
                Add
              </button>
            ) : undefined
          }
        />
        <NotificationBar variant="sticky" />
      </div>

      {/* Edge-to-edge fixed header */}
      <header className="z-30 hidden h-14 shrink-0 border-b border-neutral-200/90 bg-white md:flex">
        <div className="flex h-full w-full max-w-none items-center">
          {/* Brand aligned with sidebar */}
          <div
            className={`hidden h-full shrink-0 items-center border-r border-neutral-100 px-5 lg:flex ${SIDEBAR_W_CLASS}`}
          >
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-dark">
                AreaIQ
              </p>
              <p className="truncate text-sm font-semibold text-heading-primary">
                Admin Portal
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setTabletOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 lg:hidden"
              aria-label="Open menu"
            >
              ☰
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-heading-primary lg:text-base">
                {activeLabel}
              </p>
              <p className="hidden truncate text-xs text-muted sm:block">
                Control Panel
              </p>
            </div>

            <div className="flex-1" aria-hidden />

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {onAddProperty && (tab === "properties" || tab === "add") ? (
                <button
                  type="button"
                  onClick={onAddProperty}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98] sm:px-4 sm:text-sm"
                >
                  <span aria-hidden>+</span>
                  Add Property
                </button>
              ) : null}
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
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Fixed desktop sidebar */}
        <aside
          className={`fixed bottom-0 left-0 top-14 z-20 hidden flex-col border-r border-neutral-200/90 bg-white lg:flex ${SIDEBAR_W_CLASS}`}
        >
          {sidebar}
          <div className="border-t border-neutral-100 px-4 py-3">
            <p className="text-[11px] text-muted">Enterprise control panel</p>
          </div>
        </aside>

        {/* Tablet drawer */}
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
                <button
                  type="button"
                  onClick={() => setTabletOpen(false)}
                  className="text-muted"
                >
                  ✕
                </button>
              </div>
              {sidebar}
            </aside>
          </>
        ) : null}

        {/* Scrollable content — fills remaining viewport */}
        <main
          className={`admin-shell-main min-h-0 w-full max-w-none flex-1 overflow-x-hidden overflow-y-auto px-4 py-5 pb-nav sm:px-6 md:px-6 md:py-6 lg:px-8 lg:py-8 lg:pb-8 ${SIDEBAR_ML_CLASS}`}
        >
          <div className="w-full max-w-none animate-page-enter">{children}</div>
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
