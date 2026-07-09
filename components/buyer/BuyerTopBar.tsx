"use client";

import Link from "next/link";
import Logo from "@/components/common/Logo";
import NotificationBell from "./NotificationBell";
import { ButtonLink } from "@/components/ui/Button";

interface BuyerTopBarProps {
  title?: string;
  subtitle?: string;
}

export default function BuyerTopBar({ title, subtitle }: BuyerTopBarProps) {
  return (
    <header className="sticky top-0 z-30 hidden items-center justify-between gap-4 border-b border-neutral-200/80 bg-white/95 px-6 py-3 backdrop-blur-xl lg:flex">
      <div className="min-w-0">
        {title ? (
          <>
            <p className="text-sm font-semibold text-neutral-900">{title}</p>
            {subtitle ? <p className="text-xs text-neutral-500">{subtitle}</p> : null}
          </>
        ) : (
          <Logo size="dashboard" href="/buyer" />
        )}
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/ask"
          className="hidden items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600 transition hover:bg-white sm:flex"
        >
          <span aria-hidden>🤖</span>
          <span className="font-medium">Ask AI</span>
        </Link>
        <NotificationBell />
        <ButtonLink href="/properties" variant="secondary" size="sm">
          Browse
        </ButtonLink>
      </div>
    </header>
  );
}
