"use client";

import Link from "next/link";

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
    <div className="min-h-screen bg-[#FAFAFA] pt-16">
      <header className="sticky top-16 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-heading-primary">{title}</p>
            {subtitle ? <p className="truncate text-xs text-muted">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-3">
            <Link href={backHref} className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
              {backLabel}
            </Link>
            <Link
              href="/admin"
              className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-body hover:bg-neutral-50"
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
