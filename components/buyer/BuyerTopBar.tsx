"use client";

import Link from "next/link";
import NotificationBell from "./NotificationBell";
import FeatureErrorBoundary from "@/components/stability/FeatureErrorBoundary";
import RenderProbe from "@/components/stability/RenderProbe";
import { ButtonLink } from "@/components/ui/Button";

interface BuyerTopBarProps {
  title?: string;
  subtitle?: string;
}

export default function BuyerTopBar({
  title = "Buyer Dashboard",
  subtitle,
}: BuyerTopBarProps) {
  return (
    <header className="sticky-below-nav z-30 hidden items-center justify-between gap-4 border-b border-neutral-200/80 bg-white/95 px-6 py-3 backdrop-blur-xl lg:flex">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-heading-primary">{title}</p>
        {subtitle ? <p className="text-xs text-muted">{subtitle}</p> : null}
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/ask"
          className="hidden items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-body transition hover:bg-white sm:flex"
        >
          <span aria-hidden>🤖</span>
          <span className="font-medium">Ask AreaIQ</span>
        </Link>
        <FeatureErrorBoundary name="Notifications" compact>
          <RenderProbe name="NotificationBell:desktop">
            <NotificationBell />
          </RenderProbe>
        </FeatureErrorBoundary>
        <ButtonLink href="/properties" variant="secondary" size="sm">
          Browse
        </ButtonLink>
      </div>
    </header>
  );
}
