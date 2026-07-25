"use client";

import { useState } from "react";
import ConnectNotificationBell from "@/components/connect/ConnectNotificationBell";
import { CONNECT_NAV, type ConnectTab } from "@/lib/connect/types";
import { getInitials } from "@/lib/auth/profile";
import BottomNav from "@/components/layout/BottomNav";
import MobileTopBar from "@/components/layout/MobileTopBar";
import MenuSheet from "@/components/layout/MenuSheet";
import { CONNECT_BOTTOM_NAV, type BottomNavItem } from "@/lib/design/bottomNav";

interface ConnectShellProps {
  tab: ConnectTab;
  onTabChange: (tab: ConnectTab) => void;
  companyName?: string | null;
  userName?: string | null;
  userId?: string;
  avatarUrl?: string | null;
  newLeads: number;
  unreadNotifications?: number;
  onLogout: () => void;
  children: React.ReactNode;
}

const PRIMARY = new Set(["home", "properties", "pipeline", "visits"]);

export default function ConnectShell({
  tab,
  onTabChange,
  companyName,
  userName,
  userId,
  avatarUrl,
  newLeads,
  onLogout,
  children,
}: ConnectShellProps) {
  const [tabletOpen, setTabletOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const activeBottomId =
    CONNECT_BOTTOM_NAV.find((i) => i.tab === tab)?.id ??
    (PRIMARY.has(tab) ? tab : "menu");

  const handleBottomSelect = (item: BottomNavItem) => {
    if (item.action === "menu") {
      setMenuOpen(true);
      return;
    }
    if (item.tab) onTabChange(item.tab as ConnectTab);
  };

  const sidebar = (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3" aria-label="Connect partner navigation">
      {CONNECT_NAV.map((item) => {
        const active = tab === item.key;
        let badge = 0;
        if (item.key === "leads" && newLeads > 0) badge = newLeads;
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
            {badge > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-xs font-bold text-white">
                {badge > 9 ? "9+" : badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen overflow-x-clip bg-[#F8FAFC] lg:pt-layout">
      <MobileTopBar
        title={companyName ?? "Connect"}
        onNotifications={() => onTabChange("notifications")}
        onProfile={() => onTabChange("settings")}
        onMenu={() => setMenuOpen(true)}
        searchHref="/connect/dashboard?tab=properties"
      />

      <header className="sticky top-chrome z-layout-sticky hidden border-b border-neutral-200 bg-white/95 backdrop-blur-xl md:block">
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6 lg:pl-[17.5rem] lg:pr-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setTabletOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 lg:hidden"
              aria-label="Open menu"
            >
              ☰
            </button>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-heading-primary">Connect Dashboard</p>
              <p className="truncate text-xs text-muted">{companyName ?? "Partner CRM"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ConnectNotificationBell userId={userId} onViewAll={() => onTabChange("notifications")} />
            <button
              type="button"
              onClick={() => onTabChange("settings")}
              className="relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-emerald-600"
              aria-label="Settings"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-white">
                  {getInitials(userName, companyName)}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="hidden rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-body hover:bg-neutral-50 sm:inline-flex"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="fixed bottom-0 left-0 top-[calc(var(--chrome-top)+3.5rem)] hidden w-64 flex-col border-r border-neutral-200 bg-white lg:flex">
          <div className="border-b border-neutral-100 px-4 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-dark">
              AreaIQ Connect
            </p>
            <p className="mt-1 truncate text-sm font-bold text-heading-primary">
              {companyName ?? userName ?? "Partner"}
            </p>
            <p className="text-xs text-muted">Partner workspace</p>
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
            <aside className="fixed bottom-0 left-0 top-0 z-50 flex w-[min(300px,90vw)] flex-col bg-white shadow-xl lg:hidden">
              <div className="flex h-16 items-center justify-between border-b px-4">
                <span className="font-semibold">Connect CRM</span>
                <button type="button" onClick={() => setTabletOpen(false)}>
                  ✕
                </button>
              </div>
              {sidebar}
              <div className="border-t p-4">
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-sm font-medium text-rose-600"
                >
                  Logout
                </button>
              </div>
            </aside>
          </>
        ) : null}

        <main className="min-h-[calc(100vh-4rem)] flex-1 px-4 py-6 pb-nav sm:px-6 lg:ml-64 lg:px-8 lg:py-8 lg:pb-8">
          <div className="mx-auto max-w-7xl animate-page-enter">{children}</div>
        </main>
      </div>

      <BottomNav
        items={CONNECT_BOTTOM_NAV}
        activeId={activeBottomId}
        onItemSelect={handleBottomSelect}
      />

      <MenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Connect menu"
        items={[
          ...CONNECT_NAV.filter((n) => !PRIMARY.has(n.key)).map((n) => ({
            id: n.key,
            label: n.label,
            icon: n.icon,
            badge: n.key === "leads" && newLeads > 0 ? newLeads : undefined,
          })),
          { id: "__logout", label: "Logout", danger: true },
        ]}
        onSelect={(id) => {
          if (id === "__logout") onLogout();
          else onTabChange(id as ConnectTab);
        }}
      />
    </div>
  );
}
