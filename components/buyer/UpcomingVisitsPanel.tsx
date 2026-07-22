"use client";

import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Card, { CardHeader } from "@/components/ui/Card";
import { formatVisitTime } from "@/lib/buyer/queries";
import type { SiteVisitRow } from "@/lib/buyer/types";
import { formatVisitStatusLabel } from "@/lib/crm/visitWorkflow";

const STATUS_VARIANT: Record<string, "warning" | "info" | "success" | "error" | "neutral"> = {
  pending_approval: "warning",
  accepted: "info",
  scheduled: "success",
  completed: "neutral",
  rejected: "error",
  cancelled: "error",
};

interface UpcomingVisitsPanelProps {
  visits: SiteVisitRow[];
}

export default function UpcomingVisitsPanel({ visits }: UpcomingVisitsPanelProps) {
  if (visits.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title="Upcoming Visits"
        description="Your scheduled property tours"
        action={
          <Link href="/buyer/site-visits" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
            View all →
          </Link>
        }
      />
      <div className="space-y-3">
        {visits.map((visit) => (
          <Link
            key={visit.id}
            href="/buyer/site-visits"
            className="flex items-center gap-4 rounded-xl border border-neutral-100 bg-neutral-50/50 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/30"
          >
            <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-white text-center shadow-sm ring-1 ring-neutral-100">
              <span className="text-[10px] font-bold uppercase text-emerald-600">
                {visit.visit_date
                  ? new Date(`${visit.visit_date}T00:00:00`).toLocaleDateString("en-IN", { month: "short" })
                  : "—"}
              </span>
              <span className="text-lg font-bold leading-none text-heading-primary">
                {visit.visit_date
                  ? new Date(`${visit.visit_date}T00:00:00`).getDate()
                  : "—"}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-heading-primary">{visit.property?.title ?? "Property"}</p>
              <p className="text-xs text-muted">
                {formatVisitTime(visit.visit_time)} · {visit.property?.location}
              </p>
            </div>
            <Badge variant={STATUS_VARIANT[visit.status] ?? "neutral"}>
              {formatVisitStatusLabel(visit.status)}
            </Badge>
          </Link>
        ))}
      </div>
    </Card>
  );
}

export function VisitPreVisitPanel({ visit }: { visit: SiteVisitRow }) {
  const questions = [
    "What is the possession timeline?",
    "Are there any hidden charges or PLC?",
    "What amenities are ready vs planned?",
    "Can I see the actual unit or sample flat?",
    "What is the payment plan and loan tie-ups?",
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
        <p className="text-sm font-semibold text-blue-900">📍 Before Your Visit</p>
        <ul className="mt-2 space-y-1.5 text-xs text-blue-800">
          <li>· Check travel time and route on Google Maps</li>
          <li>· Carry a valid ID for site entry</li>
          <li>· Note nearby schools, hospitals & markets</li>
          {visit.builder_name ? <li>· Builder: {visit.builder_name}</li> : null}
        </ul>
      </div>
      <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
        <p className="text-sm font-semibold text-violet-900">❓ Questions to Ask</p>
        <ul className="mt-2 space-y-1 text-xs text-violet-800">
          {questions.map((q) => (
            <li key={q}>· {q}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
