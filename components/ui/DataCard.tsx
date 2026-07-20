"use client";

import { useState } from "react";
import BottomSheet from "@/components/ui/BottomSheet";

export type DataCardAction = {
  id: string;
  label: string;
  danger?: boolean;
  onClick: () => void;
};

interface DataCardProps {
  title: string;
  subtitle?: string;
  badges?: React.ReactNode;
  meta?: Array<{ label: string; value: React.ReactNode }>;
  expandedContent?: React.ReactNode;
  actions?: DataCardAction[];
  href?: string;
  className?: string;
}

/** Mobile-friendly row replacement — expandable card with action menu */
export default function DataCard({
  title,
  subtitle,
  badges,
  meta,
  expandedContent,
  actions,
  className = "",
}: DataCardProps) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <article
        className={`rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm transition-all active:scale-[0.99] ${className}`}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => expandedContent && setOpen((v) => !v)}
            aria-expanded={expandedContent ? open : undefined}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-heading-primary">{title}</h3>
              {badges}
            </div>
            {subtitle ? <p className="mt-0.5 truncate text-sm text-muted">{subtitle}</p> : null}
            {meta && meta.length > 0 ? (
              <dl className="mt-3 grid grid-cols-2 gap-2">
                {meta.map((m) => (
                  <div key={m.label}>
                    <dt className="text-xs font-medium uppercase tracking-wider text-label">
                      {m.label}
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-body">{m.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </button>
          {actions && actions.length > 0 ? (
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-body"
              aria-label="Actions"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <circle cx="12" cy="5" r="1.75" />
                <circle cx="12" cy="12" r="1.75" />
                <circle cx="12" cy="19" r="1.75" />
              </svg>
            </button>
          ) : null}
        </div>
        {open && expandedContent ? (
          <div className="mt-3 border-t border-neutral-100 pt-3 text-sm text-body">
            {expandedContent}
          </div>
        ) : null}
      </article>

      {actions ? (
        <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Actions">
          <ul className="space-y-1 pb-2">
            {actions.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    a.onClick();
                    setMenuOpen(false);
                  }}
                  className={`flex min-h-12 w-full items-center rounded-xl px-3 text-left text-base font-medium ${
                    a.danger ? "text-rose-600" : "text-heading-primary"
                  }`}
                >
                  {a.label}
                </button>
              </li>
            ))}
          </ul>
        </BottomSheet>
      ) : null}
    </>
  );
}

/** Desktop table + mobile card list wrapper */
export function ResponsiveDataView({
  table,
  cards,
}: {
  table: React.ReactNode;
  cards: React.ReactNode;
}) {
  return (
    <>
      <div className="hidden lg:block">{table}</div>
      <div className="space-y-3 lg:hidden">{cards}</div>
    </>
  );
}
