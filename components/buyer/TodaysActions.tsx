"use client";

import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { formatVisitDate, formatVisitTime } from "@/lib/buyer/queries";
import type { SiteVisitRow } from "@/lib/buyer/types";

interface TodaysActionsProps {
  upcomingVisits: SiteVisitRow[];
  pendingApprovals: number;
  profileIncomplete: boolean;
  onCompleteProfile: () => void;
}

export default function TodaysActions({
  upcomingVisits,
  pendingApprovals,
  profileIncomplete,
  onCompleteProfile,
}: TodaysActionsProps) {
  const actions: { icon: string; title: string; desc: string; href?: string; onClick?: () => void; urgent?: boolean }[] = [];

  if (upcomingVisits.length > 0) {
    const next = upcomingVisits[0];
    actions.push({
      icon: "📅",
      title: `Visit ${next.status === "pending_approval" ? "pending approval" : "tomorrow"}`,
      desc: `${next.property?.title ?? "Property"} · ${formatVisitDate(next.visit_date)} at ${formatVisitTime(next.visit_time)}`,
      href: "/buyer/site-visits",
      urgent: true,
    });
  }

  if (pendingApprovals > 0) {
    actions.push({
      icon: "⏳",
      title: `${pendingApprovals} visit${pendingApprovals > 1 ? "s" : ""} awaiting approval`,
      desc: "Seller will confirm your site visit request soon",
      href: "/buyer/site-visits",
    });
  }

  if (profileIncomplete) {
    actions.push({
      icon: "✨",
      title: "Complete your profile",
      desc: "Unlock smarter AI recommendations and faster inquiries",
      onClick: onCompleteProfile,
    });
  }

  if (actions.length === 0) {
    actions.push({
      icon: "🏠",
      title: "Explore new properties",
      desc: "Browse listings matched to your budget and preferred areas",
      href: "/properties",
    });
  }

  return (
    <section aria-label="Today's actions">
      <h2 className="mb-4 text-lg font-bold text-neutral-900">Today&apos;s Actions</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => {
          const inner = (
            <>
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl">{action.icon}</span>
                {action.urgent ? <Badge variant="warning">Priority</Badge> : null}
              </div>
              <p className="mt-3 text-sm font-semibold text-neutral-900">{action.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500">{action.desc}</p>
            </>
          );

          const className =
            "group rounded-2xl border border-neutral-200/80 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md";

          if (action.onClick) {
            return (
              <button key={action.title} type="button" onClick={action.onClick} className={className}>
                {inner}
              </button>
            );
          }

          return (
            <Link key={action.title} href={action.href ?? "/buyer"} className={className}>
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
