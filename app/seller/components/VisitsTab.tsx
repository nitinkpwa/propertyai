"use client";

import { useState } from "react";
import type { SellerVisitRow } from "@/lib/seller/types";
import { btnSecondary, inp } from "@/lib/seller/constants";
import { BuyerContactLine } from "@/components/crm/BuyerProfileGrid";
import { formatVisitStatusLabel } from "@/lib/crm/visitWorkflow";

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

  const contactVisible =
    visit.status === "scheduled" ||
    visit.status === "accepted" ||
    visit.status === "completed";

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-neutral-900">{visit.property?.title ?? "Property"}</p>
          <div className="mt-2">
            <BuyerContactLine buyer={visit.buyer} />
          </div>
          {visit.purpose ? (
            <p className="mt-1 text-xs text-neutral-600">Visit purpose: {visit.purpose}</p>
          ) : null}
        </div>
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-700">
          {formatVisitStatusLabel(visit.status)}
        </span>
      </div>

      <p className="mt-3 text-xs text-neutral-500">
        Visit: {visit.visit_date} at {visit.visit_time?.slice(0, 5)}
      </p>

      {contactVisible && visit.buyer ? (
        <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          <p className="font-semibold">Buyer contact (approved visit)</p>
          {visit.buyer.phone ? <p>📞 {visit.buyer.phone}</p> : null}
          {visit.buyer.email ? <p>✉ {visit.buyer.email}</p> : null}
        </div>
      ) : null}

      {visit.visit_location && contactVisible ? (
        <p className="mt-2 text-xs text-neutral-600">📍 Meeting: {visit.visit_location}</p>
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

      {visit.status === "scheduled" || visit.status === "accepted" ? (
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
  const scheduled = visits.filter((v) =>
    ["accepted", "scheduled"].includes(v.status),
  );
  const completed = visits.filter((v) => v.status === "completed");
  const rejected = visits.filter((v) => v.status === "rejected" || v.status === "cancelled");

  if (visits.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-16 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-50 text-3xl">
          📅
        </div>
        <h3 className="text-lg font-semibold text-neutral-900">No site visit requests yet</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">
          Buyer visit requests will appear here for you to approve or reschedule.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-3 text-sm font-semibold text-neutral-900">New Visit Requests</h3>
        {pending.length === 0 ? (
          <p className="text-sm text-neutral-500">None pending</p>
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
        <h3 className="mb-3 text-sm font-semibold text-neutral-900">Approved / Scheduled</h3>
        {scheduled.length === 0 ? (
          <p className="text-sm text-neutral-500">None</p>
        ) : (
          <div className="space-y-3">
            {scheduled.map((v) => (
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
        <h3 className="mb-3 text-sm font-semibold text-neutral-900">Completed</h3>
        {completed.length === 0 ? (
          <p className="text-sm text-neutral-500">None</p>
        ) : (
          <div className="space-y-3">
            {completed.map((v) => (
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

      {rejected.length > 0 ? (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-neutral-900">Rejected / Cancelled</h3>
          <div className="space-y-3">
            {rejected.map((v) => (
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
        </section>
      ) : null}
    </div>
  );
}
