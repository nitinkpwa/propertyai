"use client";

import { useEffect, useState } from "react";
import { fetchAdminBuyerJourney } from "@/lib/crm/queries";
import type { AdminBuyerJourney } from "@/lib/crm/types";
import ActivityTimeline from "@/components/crm/ActivityTimeline";
import LeadStatusBadge from "@/components/crm/LeadStatusBadge";

interface AdminBuyerJourneyPanelProps {
  buyerId: string;
  buyerName?: string | null;
}

function formatBudget(min?: number | null, max?: number | null): string {
  if (min == null && max == null) return "Not set";
  const fmt = (n: number) =>
    n >= 10_000_000 ? `₹${(n / 10_000_000).toFixed(1)} Cr` : `₹${(n / 100_000).toFixed(0)} L`;
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (max != null) return `Up to ${fmt(max)}`;
  return min != null ? `From ${fmt(min)}` : "Not set";
}

export default function AdminBuyerJourneyPanel({
  buyerId,
  buyerName,
}: AdminBuyerJourneyPanelProps) {
  const [journey, setJourney] = useState<AdminBuyerJourney | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchAdminBuyerJourney(buyerId).then((data) => {
      setJourney(data);
      setLoading(false);
    });
  }, [buyerId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
      </div>
    );
  }

  if (!journey) {
    return <p className="text-sm text-neutral-500">Could not load buyer journey.</p>;
  }

  const profile = journey.profile as Record<string, unknown> | null;

  return (
    <div className="mt-6 space-y-6 border-t border-neutral-200 pt-6">
      <div>
        <h4 className="font-semibold text-neutral-900">
          Complete Buyer Record — {buyerName ?? (profile?.full_name as string) ?? "Buyer"}
        </h4>
        {journey.lead ? (
          <div className="mt-2">
            <LeadStatusBadge status={journey.lead.status} />
          </div>
        ) : null}
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(
          [
            ["Full Name", String(profile?.full_name ?? "—")],
            ["Phone", String(profile?.phone ?? "—")],
            ["Email", String(profile?.email ?? "—")],
            [
              "Budget",
              String(
                (profile?.budgetLabel as string | undefined) ??
                  formatBudget(profile?.budget_min as number, profile?.budget_max as number),
              ),
            ],
            ["City", String(profile?.city ?? "—")],
            [
              "Preferred Areas",
              Array.isArray(profile?.preferred_locations)
                ? (profile.preferred_locations as string[]).join(", ") || "—"
                : "—",
            ],
            [
              "Property Types",
              Array.isArray(profile?.preferred_property_types)
                ? (profile.preferred_property_types as string[]).join(", ") || "—"
                : "—",
            ],
          ] satisfies [string, string][]
        ).map(([label, value]) => (
          <div key={label} className="rounded-xl bg-neutral-50 px-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-wider text-neutral-400">{label}</dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900">{value}</dd>
          </div>
        ))}
      </dl>

      {journey.aiSummary ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">AI Summary</p>
          <p className="mt-2 text-sm text-neutral-700">{journey.aiSummary}</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h5 className="mb-2 text-sm font-semibold text-neutral-800">Enquiries ({journey.enquiries.length})</h5>
          <ul className="max-h-40 space-y-2 overflow-y-auto text-sm">
            {journey.enquiries.map((inq) => (
              <li key={String(inq.id)} className="rounded-lg bg-neutral-50 px-3 py-2">
                {(inq.property as { title?: string })?.title ?? "Inquiry"} — {String(inq.message ?? "").slice(0, 80)}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h5 className="mb-2 text-sm font-semibold text-neutral-800">Saved ({journey.savedProperties.length})</h5>
          <ul className="max-h-40 space-y-2 overflow-y-auto text-sm">
            {journey.savedProperties.map((s) => (
              <li key={String(s.id)} className="rounded-lg bg-neutral-50 px-3 py-2">
                {(s.property as { title?: string })?.title ?? "Property"}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h5 className="mb-2 text-sm font-semibold text-neutral-800">Site Visits ({journey.siteVisits.length})</h5>
        <ul className="space-y-2 text-sm">
          {journey.siteVisits.map((v) => (
            <li key={v.id} className="rounded-lg bg-neutral-50 px-3 py-2">
              {(v.property as { title?: string })?.title ?? "Visit"} · {v.status} · {v.visit_date}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h5 className="mb-3 text-sm font-semibold text-neutral-800">CRM Timeline</h5>
        <ActivityTimeline activities={journey.activities} />
      </div>
    </div>
  );
}
