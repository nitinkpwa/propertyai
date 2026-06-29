"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  fetchSiteVisits,
  formatVisitDate,
  formatVisitTime,
} from "@/lib/buyer/queries";
import type { SiteVisitRow } from "@/lib/buyer/types";
import EmptyState from "../components/EmptyState";

const STATUS_STYLES: Record<SiteVisitRow["status"], string> = {
  scheduled: "bg-amber-50 text-amber-700 ring-amber-200/80",
  confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
  completed: "bg-neutral-100 text-neutral-700 ring-neutral-200/80",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200/80",
};

export default function SiteVisitsPage() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<SiteVisitRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchSiteVisits(user.id).then((data) => {
      setVisits(data);
      setLoading(false);
    });
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
          Site Visits
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Your booked property visits and their status
        </p>
      </div>

      {visits.length === 0 ? (
        <EmptyState
          icon="📅"
          title="No site visits booked"
          description="When you book a site visit from a property page, it will show up here."
        />
      ) : (
        <div className="space-y-4">
          {visits.map((visit) => (
            <article
              key={visit.id}
              className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-neutral-900">
                    {visit.property?.title ?? "Property"}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    {visit.property?.location}
                    {visit.property?.city ? `, ${visit.property.city}` : ""}
                  </p>
                  <p className="mt-3 text-sm text-neutral-700">
                    <span className="font-medium text-neutral-500">Builder: </span>
                    {visit.builder_name ?? "—"}
                  </p>
                </div>
                <span
                  className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${STATUS_STYLES[visit.status]}`}
                >
                  {visit.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 border-t border-neutral-100 pt-4 sm:grid-cols-2">
                <div className="rounded-xl bg-neutral-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Date</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">
                    {formatVisitDate(visit.visit_date)}
                  </p>
                </div>
                <div className="rounded-xl bg-neutral-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Time</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">
                    {formatVisitTime(visit.visit_time)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
