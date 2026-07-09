"use client";

import { useState } from "react";
import Logo from "@/components/common/Logo";
import ConnectNotificationBell from "@/components/connect/ConnectNotificationBell";
import { CONNECT_NAV, type ConnectTab } from "@/lib/connect/types";
import { getInitials } from "@/lib/auth/profile";

const MOBILE_NAV: ConnectTab[] = ["home", "properties", "leads", "visits", "notifications"];

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
  const [mobileOpen, setMobileOpen] = useState(false);

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
            onClick={() => { onTabChange(item.key); setMobileOpen(false); }}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${
              active
                ? "bg-emerald-50 text-emerald-800 shadow-sm ring-1 ring-emerald-200/60"
                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
            }`}
          >
            <span aria-hidden>{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {badge > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                {badge > 9 ? "9+" : badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:pl-[17.5rem] lg:pr-8">
          <div className="flex items-center gap-3 lg:hidden">
            <button type="button" onClick={() => setMobileOpen(true)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200" aria-label="Open menu">☰</button>
            <Logo size="dashboard" suffix="Connect" href="/connect" />
          </div>
          <Logo size="dashboard" suffix="Connect" href="/connect" className="hidden lg:flex" />
          <p className="hidden truncate text-sm font-semibold text-neutral-700 sm:block">
            {companyName ?? "Connect Partner CRM"}
          </p>
          <div className="flex items-center gap-2">
            <ConnectNotificationBell userId={userId} onViewAll={() => onTabChange("notifications")} />
            <button type="button" onClick={() => onTabChange("settings")} className="relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-emerald-600" aria-label="Settings">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-white">{getInitials(userName, companyName)}</span>
              )}
            </button>
            <button type="button" onClick={onLogout} className="hidden rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 sm:inline-flex">Logout</button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="fixed bottom-0 left-0 top-16 hidden w-64 flex-col border-r border-neutral-200 bg-white lg:flex">
          <div className="border-b border-neutral-100 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Channel Partner</p>
            <p className="mt-1 truncate text-sm font-bold text-neutral-900">{companyName ?? userName ?? "Partner"}</p>
            <p className="text-xs text-emerald-600">Property-based CRM</p>
          </div>
          {sidebar}
        </aside>

        {mobileOpen ? (
          <>
            <div className="fixed inset-0 z-40 bg-neutral-900/20 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden />
            <aside className="fixed bottom-0 left-0 top-0 z-50 flex w-[min(300px,90vw)] flex-col bg-white shadow-xl lg:hidden">
              <div className="flex h-16 items-center justify-between border-b px-4">
                <span className="font-semibold">Connect CRM</span>
                <button type="button" onClick={() => setMobileOpen(false)}>✕</button>
              </div>
              {sidebar}
              <div className="border-t p-4">
                <button type="button" onClick={onLogout} className="w-full rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-sm font-medium text-rose-600">Logout</button>
              </div>
            </aside>
          </>
        ) : null}

        <main className="min-h-[calc(100vh-4rem)] flex-1 px-4 py-6 pb-24 sm:px-6 lg:ml-64 lg:px-8 lg:py-8 lg:pb-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur-xl lg:hidden" aria-label="Mobile navigation">
        <div className="flex justify-around py-1.5">
          {MOBILE_NAV.map((key) => {
            const item = CONNECT_NAV.find((n) => n.key === key)!;
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onTabChange(key)}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${active ? "text-emerald-600" : "text-neutral-500"}`}
              >
                <span>{item.icon}</span>
                {item.label.split(" ")[0]}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
