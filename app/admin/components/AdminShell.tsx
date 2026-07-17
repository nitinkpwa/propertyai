"use client";

import Link from "next/link";
import { useState } from "react";
import type { AdminTab } from "@/lib/admin/types";

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

export default function AdminShell({
  tab,
  onTabChange,
  navItems,
  onLogout,
  children,
}: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

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
              setMobileOpen(false);
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
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-100 px-1.5 text-[10px] font-bold text-body">
                {item.count}
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
            </aside>
          </>
        ) : null}

        <main className="min-h-[calc(100vh-4rem)] flex-1 px-4 py-6 sm:px-6 lg:ml-64 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
