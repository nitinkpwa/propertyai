"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { manageSiteVisit } from "@/lib/crm/queries";
import {
  formatVisitStatusLabel,
  isApprovedVisitStatus,
  parseVisitPurposeMeta,
} from "@/lib/crm/visitWorkflow";
import type { ConnectSiteVisitRow } from "@/lib/crm/types";
import { connectTokens } from "@/lib/connect/design";
import ConnectEmptyModule from "@/app/connect/components/ConnectEmptyModule";

interface Props {
  visits: ConnectSiteVisitRow[];
  onRefresh: () => void;
}

function formatCreatedAt(value?: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function phoneDigits(phone?: string | null): string {
  return (phone ?? "").replace(/\D/g, "");
}

function VisitCard({
  visit,
  showApproveReject,
  showComplete,
  showReschedule,
  acting,
  onAction,
}: {
  visit: ConnectSiteVisitRow;
  showApproveReject?: boolean;
  showComplete?: boolean;
  showReschedule?: boolean;
  acting: string | null;
  onAction: (
    visitId: string,
    action: "accept" | "reject" | "reschedule" | "complete",
    extra?: { visitDate?: string; visitTime?: string; reason?: string },
  ) => Promise<void>;
}) {
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [reason, setReason] = useState("");
  const busy = acting === visit.id;
  const meta = parseVisitPurposeMeta(visit.purpose);
  const phone = visit.buyer?.phone ?? null;
  const digits = phoneDigits(phone);
  const project =
    visit.property?.builder_name ||
    visit.builder_name ||
    visit.property?.city ||
    "—";

  return (
    <li className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-heading-primary">
            {visit.property?.title ?? "Property visit"}
          </p>
          <p className="mt-0.5 text-xs text-muted">Project · {project}</p>
        </div>
        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-body">
          {formatVisitStatusLabel(visit.status)}
        </span>
      </div>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted">Buyer Name</dt>
          <dd className="font-medium text-heading-primary">
            {visit.buyer?.full_name ?? "Buyer"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Buyer Phone</dt>
          <dd className="font-medium text-heading-primary">{phone ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Buyer Email</dt>
          <dd className="font-medium text-heading-primary">
            {visit.buyer?.email ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Property</dt>
          <dd className="font-medium text-heading-primary">
            {visit.property?.title ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Requested Date</dt>
          <dd className="font-medium text-heading-primary">{visit.visit_date}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Requested Time</dt>
          <dd className="font-medium text-heading-primary">
            {String(visit.visit_time).slice(0, 5)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Language</dt>
          <dd className="font-medium text-heading-primary">{meta.language ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Loan Required</dt>
          <dd className="font-medium text-heading-primary">
            {meta.loanRequired ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Transport</dt>
          <dd className="font-medium text-heading-primary">{meta.transport ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Created Time</dt>
          <dd className="font-medium text-heading-primary">
            {formatCreatedAt(visit.created_at)}
          </dd>
        </div>
      </dl>

      {(meta.notes || meta.rawPurpose) && (
        <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-body">
          <span className="font-semibold">Notes: </span>
          {meta.notes || meta.rawPurpose}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {showApproveReject ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onAction(visit.id, "accept")}
              className={`${connectTokens.btnPrimary} text-xs`}
            >
              {busy ? "..." : "Approve"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setRejectOpen((v) => !v)}
              className={`${connectTokens.btnSecondary} text-xs`}
            >
              Reject
            </button>
          </>
        ) : null}

        {showReschedule ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setRescheduleOpen((v) => !v)}
            className={`${connectTokens.btnSecondary} text-xs`}
          >
            Reschedule
          </button>
        ) : null}

        {showComplete ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onAction(visit.id, "complete")}
            className={`${connectTokens.btnPrimary} text-xs`}
          >
            {busy ? "..." : "Mark Completed"}
          </button>
        ) : null}

        {digits ? (
          <>
            <a
              href={`tel:${digits}`}
              className={`${connectTokens.btnSecondary} text-xs`}
            >
              Call Buyer
            </a>
            <a
              href={`https://wa.me/${digits.startsWith("91") ? digits : `91${digits}`}`}
              target="_blank"
              rel="noreferrer"
              className={`${connectTokens.btnSecondary} text-xs`}
            >
              Open WhatsApp
            </a>
          </>
        ) : null}

        {visit.property_id ? (
          <Link
            href={`/property/${visit.property_id}`}
            className={`${connectTokens.btnSecondary} text-xs`}
          >
            View Property
          </Link>
        ) : null}
      </div>

      {rejectOpen ? (
        <div className="mt-3 space-y-2 rounded-lg border border-rose-100 bg-rose-50/50 p-3">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Rejection reason (optional)"
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void onAction(visit.id, "reject", { reason: reason.trim() || undefined })
            }
            className={`${connectTokens.btnPrimary} text-xs`}
          >
            Confirm Reject
          </button>
        </div>
      ) : null}

      {rescheduleOpen ? (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-neutral-100 bg-neutral-50 p-3">
          <label className="text-xs">
            New Date
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="mt-1 block rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs">
            New Time
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="mt-1 block rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={busy || !newDate || !newTime}
            onClick={() =>
              void onAction(visit.id, "reschedule", {
                visitDate: newDate,
                visitTime: newTime,
              })
            }
            className={`${connectTokens.btnPrimary} text-xs`}
          >
            Save Reschedule
          </button>
        </div>
      ) : null}
    </li>
  );
}

export default function SiteVisitsPanel({ visits, onRefresh }: Props) {
  const [acting, setActing] = useState<string | null>(null);

  const pending = useMemo(
    () => visits.filter((v) => v.status === "pending_approval"),
    [visits],
  );
  const upcoming = useMemo(
    () => visits.filter((v) => isApprovedVisitStatus(v.status)),
    [visits],
  );
  const completed = useMemo(
    () => visits.filter((v) => v.status === "completed"),
    [visits],
  );
  const cancelled = useMemo(
    () => visits.filter((v) => ["rejected", "cancelled"].includes(v.status)),
    [visits],
  );

  const handleAction = async (
    visitId: string,
    action: "accept" | "reject" | "reschedule" | "complete",
    extra?: { visitDate?: string; visitTime?: string; reason?: string },
  ) => {
    setActing(visitId);
    await manageSiteVisit(visitId, action, extra);
    setActing(null);
    onRefresh();
  };

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
        <p className={connectTokens.subheading}>
          Visits on properties assigned to you — approve, reschedule, and follow up
        </p>
      </div>

      {pending.length > 0 ? (
        <section>
          <h3 className="mb-3 font-semibold text-amber-800">
            Pending ({pending.length})
          </h3>
          <ul className="space-y-3">
            {pending.map((v) => (
              <VisitCard
                key={v.id}
                visit={v}
                showApproveReject
                showReschedule
                acting={acting}
                onAction={handleAction}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {upcoming.length > 0 ? (
        <section>
          <h3 className="mb-3 font-semibold text-emerald-800">
            Approved / Rescheduled ({upcoming.length})
          </h3>
          <ul className="space-y-3">
            {upcoming.map((v) => (
              <VisitCard
                key={v.id}
                visit={v}
                showComplete
                showReschedule
                acting={acting}
                onAction={handleAction}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {completed.length > 0 ? (
        <section>
          <h3 className="mb-3 font-semibold text-body">
            Completed ({completed.length})
          </h3>
          <ul className="space-y-3">
            {completed.map((v) => (
              <VisitCard
                key={v.id}
                visit={v}
                acting={acting}
                onAction={handleAction}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {cancelled.length > 0 ? (
        <section>
          <h3 className="mb-3 font-semibold text-rose-700">
            Rejected / Cancelled ({cancelled.length})
          </h3>
          <ul className="space-y-3">
            {cancelled.map((v) => (
              <VisitCard
                key={v.id}
                visit={v}
                acting={acting}
                onAction={handleAction}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
