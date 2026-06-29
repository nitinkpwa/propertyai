"use client";

import { useState } from "react";
import type { SellerVisitRow, VisitStatus } from "@/lib/seller/types";
import { btnSecondary, inp } from "@/lib/seller/constants";

interface Props {
  visits: SellerVisitRow[];
  onUpdateStatus: (id: string, status: VisitStatus) => void;
  onReschedule: (id: string, date: string, time: string) => void;
}

function VisitSection({
  title,
  items,
  onUpdateStatus,
  onReschedule,
}: {
  title: string;
  items: SellerVisitRow[];
  onUpdateStatus: Props["onUpdateStatus"];
  onReschedule: Props["onReschedule"];
}) {
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  if (items.length === 0) {
    return (
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
        <p className="mt-1 text-sm text-neutral-500">None</p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h3 className="mb-3 text-sm font-semibold text-neutral-900">{title}</h3>
      <div className="space-y-3">
        {items.map((v) => (
          <div key={v.id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="font-semibold text-neutral-900">{v.property?.title ?? "Property"}</p>
            <p className="mt-1 text-xs text-neutral-500">
              {v.buyer?.full_name ?? "Buyer"} · {v.visit_date} at {v.visit_time}
            </p>
            <p className="mt-1 text-xs capitalize text-neutral-400">Status: {v.status}</p>
            {title === "Upcoming Visits" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" style={btnSecondary} onClick={() => onUpdateStatus(v.id, "confirmed")}>Approve</button>
                <button type="button" style={btnSecondary} onClick={() => onUpdateStatus(v.id, "cancelled")}>Reject</button>
                <button type="button" style={btnSecondary} onClick={() => setRescheduleId(v.id)}>Reschedule</button>
              </div>
            ) : null}
            {rescheduleId === v.id ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <input type="date" style={inp} className="!w-auto" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                <input type="time" style={inp} className="!w-auto" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
                <button type="button" style={btnSecondary} onClick={() => {
                  if (newDate && newTime) {
                    onReschedule(v.id, newDate, newTime);
                    setRescheduleId(null);
                  }
                }}>Save</button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VisitsTab({ visits, onUpdateStatus, onReschedule }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const upcoming = visits.filter(
    (v) => (v.status === "scheduled" || v.status === "confirmed") && v.visit_date >= today,
  );
  const completed = visits.filter((v) => v.status === "completed");
  const cancelled = visits.filter((v) => v.status === "cancelled");

  if (visits.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-16 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-50 text-3xl">
          📅
        </div>
        <h3 className="text-lg font-semibold text-neutral-900">No site visits yet</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">
          Scheduled property visits from buyers will show up here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <VisitSection title="Upcoming Visits" items={upcoming} onUpdateStatus={onUpdateStatus} onReschedule={onReschedule} />
      <VisitSection title="Completed Visits" items={completed} onUpdateStatus={onUpdateStatus} onReschedule={onReschedule} />
      <VisitSection title="Cancelled Visits" items={cancelled} onUpdateStatus={onUpdateStatus} onReschedule={onReschedule} />
    </div>
  );
}
