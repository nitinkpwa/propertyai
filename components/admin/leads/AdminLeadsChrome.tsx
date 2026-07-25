"use client";

import Link from "next/link";

/**
 * Full-width chrome for /admin/leads routes — matches AdminShell CRM layout
 * (no public-site max-width container).
 */
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
    <div className="admin-shell flex min-h-dvh flex-col bg-[#F7F8FA]">
      <header className="sticky top-0 z-30 shrink-0 border-b border-neutral-200/90 bg-white">
        <div className="flex h-14 w-full max-w-none items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-heading-primary">{title}</p>
            {subtitle ? <p className="truncate text-xs text-muted">{subtitle}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href={backHref}
              className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
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
      <main className="admin-shell-main w-full max-w-none flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
