"use client";

import { useState } from "react";
import { manageSiteVisit } from "@/lib/crm/queries";
import { formatVisitStatusLabel } from "@/lib/crm/visitWorkflow";
import type { ConnectSiteVisitRow } from "@/lib/crm/types";
import { connectTokens } from "@/lib/connect/design";
import ConnectEmptyModule from "@/app/connect/components/ConnectEmptyModule";

interface Props {
  visits: ConnectSiteVisitRow[];
  onRefresh: () => void;
}

export default function SiteVisitsPanel({ visits, onRefresh }: Props) {
  const [acting, setActing] = useState<string | null>(null);

  const pending = visits.filter((v) => v.status === "pending_approval");
  const upcoming = visits.filter((v) => ["accepted", "scheduled"].includes(v.status));
  const completed = visits.filter((v) => v.status === "completed");
  const cancelled = visits.filter((v) => ["rejected", "cancelled"].includes(v.status));

  const handleAction = async (visitId: string, action: "accept" | "reject" | "complete") => {
    setActing(visitId);
    await manageSiteVisit(visitId, action);
    setActing(null);
    onRefresh();
  };

  const renderVisit = (v: ConnectSiteVisitRow, showActions = false, showComplete = false) => (
    <li key={v.id} className="rounded-xl border border-neutral-100 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-heading-primary">{v.property?.title ?? "Property visit"}</p>
          <p className="text-sm text-muted">{v.visit_date} · {String(v.visit_time).slice(0, 5)}</p>
          <p className="mt-1 text-xs text-body">{v.buyer?.full_name ?? "Buyer"} · {v.buyer?.phone ?? "—"}</p>
        </div>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold">{formatVisitStatusLabel(v.status)}</span>
      </div>
      {v.purpose ? <p className="mt-2 text-xs text-muted">Purpose: {v.purpose}</p> : null}
      {showActions ? (
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={acting === v.id} onClick={() => handleAction(v.id, "accept")} className={connectTokens.btnPrimary + " text-xs"}>{acting === v.id ? "..." : "Approve"}</button>
          <button type="button" disabled={acting === v.id} onClick={() => handleAction(v.id, "reject")} className={connectTokens.btnSecondary + " text-xs"}>Reject</button>
        </div>
      ) : null}
      {showComplete ? (
        <div className="mt-3">
          <button type="button" disabled={acting === v.id} onClick={() => handleAction(v.id, "complete")} className={connectTokens.btnPrimary + " text-xs"}>{acting === v.id ? "..." : "Mark Completed"}</button>
        </div>
      ) : null}
    </li>
  );

  if (visits.length === 0) {
    return (
      <ConnectEmptyModule
        icon="📅"
        title="No site visits yet"
        description="When buyers book visits on your assigned properties, they appear here for approval and management."
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className={connectTokens.heading}>Site Visits</h2>
        <p className={connectTokens.subheading}>Manage visit approvals, schedules, and follow-ups</p>
      </div>
      {pending.length > 0 ? (
        <section>
          <h3 className="mb-3 font-semibold text-amber-800">Pending Approval ({pending.length})</h3>
          <ul className="space-y-3">{pending.map((v) => renderVisit(v, true))}</ul>
        </section>
      ) : null}
      {upcoming.length > 0 ? (
        <section>
          <h3 className="mb-3 font-semibold text-emerald-800">Upcoming ({upcoming.length})</h3>
          <ul className="space-y-3">{upcoming.map((v) => renderVisit(v, false, true))}</ul>
        </section>
      ) : null}
      {completed.length > 0 ? (
        <section>
          <h3 className="mb-3 font-semibold text-body">Completed ({completed.length})</h3>
          <ul className="space-y-3">{completed.map((v) => renderVisit(v))}</ul>
        </section>
      ) : null}
      {cancelled.length > 0 ? (
        <section>
          <h3 className="mb-3 font-semibold text-rose-700">Cancelled / Rejected ({cancelled.length})</h3>
          <ul className="space-y-3">{cancelled.map((v) => renderVisit(v))}</ul>
        </section>
      ) : null}
    </div>
  );
}
