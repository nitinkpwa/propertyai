"use client";

import { useEffect, useState } from "react";
import {
  fetchLeadActivities,
  fetchSellerCrmLeads,
} from "@/lib/crm/queries";
import type { CrmLeadActivity, SellerCrmLeadRow } from "@/lib/crm/types";
import ActivityTimeline from "@/components/crm/ActivityTimeline";
import LeadStatusBadge from "@/components/crm/LeadStatusBadge";

interface SellerCrmPanelProps {
  sellerId: string;
}

export default function SellerCrmPanel({ sellerId }: SellerCrmPanelProps) {
  const [leads, setLeads] = useState<SellerCrmLeadRow[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [activities, setActivities] = useState<CrmLeadActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSellerCrmLeads(sellerId).then((rows) => {
      setLeads(rows);
      if (rows[0]) setSelectedLeadId(rows[0].id);
      setLoading(false);
    });
  }, [sellerId]);

  useEffect(() => {
    if (!selectedLeadId) {
      setActivities([]);
      return;
    }
    fetchLeadActivities(selectedLeadId, 20).then((acts) =>
      setActivities(acts.reverse()),
    );
  }, [selectedLeadId]);

  if (loading) return null;
  if (leads.length === 0) return null;

  const selected = leads.find((l) => l.id === selectedLeadId);

  return (
    <section className="mb-8 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-heading-primary">CRM — Buyer Leads</h3>
        <p className="text-sm text-muted">
          Unified buyer journeys for properties you own.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ul className="max-h-80 space-y-2 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-3">
          {leads.map((lead) => (
            <li key={lead.id}>
              <button
                type="button"
                onClick={() => setSelectedLeadId(lead.id)}
                className={`w-full rounded-xl px-4 py-3 text-left transition-colors ${
                  selectedLeadId === lead.id
                    ? "bg-emerald-50 ring-1 ring-emerald-200"
                    : "hover:bg-neutral-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-heading-primary">
                    {lead.buyer?.full_name ?? "Buyer"}
                  </p>
                  <LeadStatusBadge status={lead.status} />
                </div>
                {lead.propertyTitle ? (
                  <p className="mt-1 text-xs text-muted">{lead.propertyTitle}</p>
                ) : null}
              </button>
            </li>
          ))}
        </ul>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <h4 className="mb-3 text-sm font-semibold text-heading-secondary">
            Activity Timeline
            {selected?.buyer?.full_name ? ` — ${selected.buyer.full_name}` : ""}
          </h4>
          <ActivityTimeline
            activities={activities}
            emptyMessage="Select a lead to view their journey."
            maxItems={15}
          />
        </div>
      </div>
    </section>
  );
}
