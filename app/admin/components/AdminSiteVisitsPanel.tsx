"use client";

import { useMemo, useState } from "react";
import AdminEmptyState from "./AdminEmptyState";
import AdminProfileCard from "@/components/admin/AdminProfileCard";
import BuyerProfileGrid from "@/components/crm/BuyerProfileGrid";
import type { AdminSiteVisitRow } from "@/lib/admin/types";
import type { Profile } from "@/lib/supabase";
import {
  formatVisitStatusLabel,
  matchesVisitStatusFilter,
  VISIT_STATUS_FILTERS,
} from "@/lib/crm/visitWorkflow";

function visitStatusBadgeClass(status: string): string {
  if (status === "pending_approval") return "bg-amber-50 text-amber-700";
  if (status === "accepted" || status === "scheduled" || status === "rescheduled") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (status === "completed") return "bg-blue-50 text-blue-700";
  if (status === "rejected" || status === "cancelled") return "bg-rose-50 text-rose-700";
  return "bg-neutral-100 text-body";
}

export default function AdminSiteVisitsPanel({
  siteVisits,
  hasSiteVisitsTable,
  profileLookup,
}: {
  siteVisits: AdminSiteVisitRow[];
  hasSiteVisitsTable: boolean;
  profileLookup: Map<string, Profile>;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(
    () => siteVisits.filter((v) => matchesVisitStatusFilter(v.status, statusFilter)),
    [siteVisits, statusFilter],
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of VISIT_STATUS_FILTERS) {
      map[f.value] =
        f.value === "all"
          ? siteVisits.length
          : siteVisits.filter((v) => matchesVisitStatusFilter(v.status, f.value)).length;
    }
    return map;
  }, [siteVisits]);

  if (!hasSiteVisitsTable) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-heading-primary">Site Visits</h1>
        <AdminEmptyState
          icon="📅"
          title="Site visits table not available"
          description="The site_visits table is not present in your Supabase schema. Visits will appear here once the table is created."
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-heading-primary">Site Visits</h1>
      <p className="mb-6 text-sm text-muted">
        Pending, Approved, Rescheduled, Completed, Cancelled — filter across all listings.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {VISIT_STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === f.value
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
            }`}
          >
            {f.label} ({counts[f.value] ?? 0})
          </button>
        ))}
      </div>

      {siteVisits.length === 0 ? (
        <AdminEmptyState
          icon="📅"
          title="No site visits yet"
          description="Booked property visits will appear here."
        />
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          icon="📅"
          title="No visits for this filter"
          description="Try another status filter."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((v) => (
            <article
              key={v.id}
              className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
            >
              <div className="border-b border-neutral-100 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-heading-primary">
                      {v.property?.title ?? "—"}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {v.visit_date} at {v.visit_time?.slice?.(0, 5) ?? v.visit_time}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${visitStatusBadgeClass(v.status)}`}
                  >
                    {formatVisitStatusLabel(v.status)}
                  </span>
                </div>
              </div>
              <div className="space-y-4 px-5 py-4">
                <AdminProfileCard
                  profile={{ ...(v.buyer ?? {}), role: "buyer" }}
                  profileId={v.user_id}
                  lookup={profileLookup}
                  status={formatVisitStatusLabel(v.status)}
                  statusClassName={visitStatusBadgeClass(v.status)}
                  subtitle={`Site visit · ${v.property?.city ?? "—"}`}
                />
                <BuyerProfileGrid buyer={v.buyer} variant="compact" />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
