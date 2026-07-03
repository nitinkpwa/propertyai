"use client";

import Link from "next/link";
import Logo from "@/components/common/Logo";

export default function AdminLeadsChrome({
  title,
  subtitle,
  backHref = "/admin/leads",
  backLabel = "← Back to Leads",
  children,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Logo size="dashboard" suffix="Admin" href="/admin" />
            <span className="hidden h-6 w-px bg-neutral-200 sm:block" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-neutral-900">{title}</p>
              {subtitle ? <p className="truncate text-xs text-neutral-500">{subtitle}</p> : null}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href={backHref} className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
              {backLabel}
            </Link>
            <Link
              href="/admin"
              className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
            >
              Control Panel
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
