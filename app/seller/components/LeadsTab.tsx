"use client";

import type { LeadStatus, SellerLeadRow } from "@/lib/seller/types";
import { btnSecondary, formatDateTime } from "@/lib/seller/constants";

interface Props {
  leads: SellerLeadRow[];
  onUpdateStatus: (id: string, status: LeadStatus) => void;
}

export default function LeadsTab({ leads, onUpdateStatus }: Props) {
  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-16 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-50 text-3xl">
          📩
        </div>
        <h3 className="text-lg font-semibold text-neutral-900">No leads yet</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">
          When buyers contact you about your listings, they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {leads.map((inq) => (
        <div
          key={inq.id}
          className={`rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${
            inq.status === "new" ? "border-emerald-200 ring-1 ring-emerald-100" : "border-neutral-200"
          }`}
        >
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-neutral-900">{inq.buyer?.full_name ?? "Buyer"}</p>
              <p className="mt-0.5 text-xs text-neutral-500">
                {inq.buyer?.phone ? `📞 ${inq.buyer.phone}` : null}
                {inq.buyer?.email ? ` · ✉ ${inq.buyer.email}` : null}
              </p>
            </div>
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-neutral-700">
              {inq.status}
            </span>
          </div>
          <p className="text-sm font-medium text-emerald-700">
            Property: {inq.property?.title ?? "—"}
          </p>
          <p className="mt-2 rounded-xl bg-neutral-50 px-4 py-3 text-sm leading-relaxed text-neutral-700">
            {inq.message}
          </p>
          <p className="mt-2 text-xs text-neutral-400">{formatDateTime(inq.created_at)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" style={btnSecondary} onClick={() => onUpdateStatus(inq.id, "contacted")}>Mark Contacted</button>
            <button type="button" style={btnSecondary} onClick={() => onUpdateStatus(inq.id, "interested")}>Mark Interested</button>
            <button type="button" style={btnSecondary} onClick={() => onUpdateStatus(inq.id, "closed")}>Mark Closed</button>
          </div>
        </div>
      ))}
    </div>
  );
}
