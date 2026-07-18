"use client";

import { useState } from "react";
import type { SellerVisitRow } from "@/lib/seller/types";
import { btnSecondary, inp } from "@/lib/seller/constants";
import { BuyerContactLine } from "@/components/crm/BuyerProfileGrid";
import {
  formatVisitStatusLabel,
  isApprovedVisitStatus,
  parseVisitPurposeMeta,
} from "@/lib/crm/visitWorkflow";

interface Props {
  visits: SellerVisitRow[];
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onReschedule: (id: string, date: string, time: string) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
}

function VisitCard({
  visit,
  showActions,
  onAccept,
  onReject,
  onReschedule,
  onComplete,
}: {
  visit: SellerVisitRow;
  showActions?: boolean;
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onReschedule: (id: string, date: string, time: string) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
}) {
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [busy, setBusy] = useState(false);

  const contactVisible = isApprovedVisitStatus(visit.status) || visit.status === "completed";
  const meta = parseVisitPurposeMeta(visit.purpose);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-heading-primary">{visit.property?.title ?? "Property"}</p>
          <div className="mt-2">
            <BuyerContactLine buyer={visit.buyer} />
          </div>
          {meta.rawPurpose || meta.notes ? (
            <p className="mt-1 text-xs text-body">
              Notes: {meta.notes || meta.rawPurpose}
            </p>
          ) : null}
          {(meta.language || meta.loanRequired || meta.transport) && (
            <p className="mt-1 text-xs text-muted">
              {[
                meta.language ? `Language: ${meta.language}` : null,
                meta.loanRequired ? `Loan: ${meta.loanRequired}` : null,
                meta.transport ? `Transport: ${meta.transport}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-body">
          {formatVisitStatusLabel(visit.status)}
        </span>
      </div>

      <p className="mt-3 text-xs text-muted">
        Visit: {visit.visit_date} at {visit.visit_time?.slice(0, 5)}
        {visit.created_at
          ? ` · Requested ${new Date(visit.created_at).toLocaleDateString("en-IN")}`
          : ""}
      </p>

      {contactVisible && visit.buyer ? (
        <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          <p className="font-semibold">Buyer contact (approved visit)</p>
          {visit.buyer.phone ? <p>📞 {visit.buyer.phone}</p> : null}
          {visit.buyer.email ? <p>✉ {visit.buyer.email}</p> : null}
        </div>
      ) : null}

      {visit.visit_location && contactVisible ? (
        <p className="mt-2 text-xs text-body">📍 Meeting: {visit.visit_location}</p>
      ) : null}

      {showActions ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            style={btnSecondary}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onAccept(visit.id);
              setBusy(false);
            }}
          >
            Approve
          </button>
          <button
            type="button"
            style={btnSecondary}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onReject(visit.id);
              setBusy(false);
            }}
          >
            Reject
          </button>
          <button type="button" style={btnSecondary} onClick={() => setRescheduleId(visit.id)}>
            Reschedule
          </button>
        </div>
      ) : null}

      {isApprovedVisitStatus(visit.status) ? (
        <div className="mt-2">
          <button
            type="button"
            style={btnSecondary}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onComplete(visit.id);
              setBusy(false);
            }}
          >
            Mark Completed
          </button>
        </div>
      ) : null}

      {rescheduleId === visit.id ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <input type="date" style={inp} className="!w-auto" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <input type="time" style={inp} className="!w-auto" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
          <button
            type="button"
            style={btnSecondary}
            onClick={async () => {
              if (newDate && newTime) {
                setBusy(true);
                await onReschedule(visit.id, newDate, newTime);
                setRescheduleId(null);
                setBusy(false);
              }
            }}
          >
            Save
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function VisitsTab({
  visits,
  onAccept,
  onReject,
  onReschedule,
  onComplete,
}: Props) {
  const pending = visits.filter((v) => v.status === "pending_approval");
  const upcoming = visits.filter((v) => isApprovedVisitStatus(v.status));
  const past = visits.filter((v) =>
    ["completed", "rejected", "cancelled"].includes(v.status),
  );

  if (visits.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-16 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-50 text-3xl">
          📅
        </div>
        <h3 className="text-lg font-semibold text-heading-primary">No site visit requests yet</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          Buyer visit requests will appear here for you to approve or reschedule.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-3 text-sm font-semibold text-heading-primary">
          New Visit Requests ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="text-sm text-muted">None pending</p>
        ) : (
          <div className="space-y-3">
            {pending.map((v) => (
              <VisitCard
                key={v.id}
                visit={v}
                showActions
                onAccept={onAccept}
                onReject={onReject}
                onReschedule={onReschedule}
                onComplete={onComplete}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-heading-primary">
          Upcoming Visits ({upcoming.length})
        </h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted">None</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((v) => (
              <VisitCard
                key={v.id}
                visit={v}
                onAccept={onAccept}
                onReject={onReject}
                onReschedule={onReschedule}
                onComplete={onComplete}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-heading-primary">
          Past Visits / Approve History ({past.length})
        </h3>
        {past.length === 0 ? (
          <p className="text-sm text-muted">None</p>
        ) : (
          <div className="space-y-3">
            {past.map((v) => (
              <VisitCard
                key={v.id}
                visit={v}
                onAccept={onAccept}
                onReject={onReject}
                onReschedule={onReschedule}
                onComplete={onComplete}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
