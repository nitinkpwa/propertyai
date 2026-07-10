"use client";

import { useEffect, useState } from "react";
import {
  fetchAssignedConnectLeads,
  fetchAssignedConnectProperties,
  fetchAssignedConnectSiteVisits,
  fetchLeadActivities,
  manageSiteVisit,
} from "@/lib/crm/queries";
import { formatVisitStatusLabel } from "@/lib/crm/visitWorkflow";
import type { CrmLeadActivity, SellerCrmLeadRow, ConnectSiteVisitRow } from "@/lib/crm/types";
import ActivityTimeline from "@/components/crm/ActivityTimeline";
import LeadStatusBadge from "@/components/crm/LeadStatusBadge";
import BuyerProfileGrid, { BuyerContactLine } from "@/components/crm/BuyerProfileGrid";

interface ConnectCrmPanelProps {
  connectPartnerId: string;
  mode: "leads" | "visits" | "properties";
}

export default function ConnectCrmPanel({
  connectPartnerId,
  mode,
}: ConnectCrmPanelProps) {
  const [leads, setLeads] = useState<SellerCrmLeadRow[]>([]);
  const [visits, setVisits] = useState<ConnectSiteVisitRow[]>([]);
  const [properties, setProperties] = useState<
    Array<{ id: string; title: string; city: string; price: number; status: string }>
  >([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [activities, setActivities] = useState<CrmLeadActivity[]>([]);

  useEffect(() => {
    if (mode === "leads") {
      fetchAssignedConnectLeads(connectPartnerId).then((rows) => {
        setLeads(rows);
        if (rows[0]) setSelectedLeadId(rows[0].id);
      });
    } else if (mode === "visits") {
      fetchAssignedConnectSiteVisits(connectPartnerId).then(setVisits);
    } else {
      fetchAssignedConnectProperties(connectPartnerId).then(setProperties);
    }
  }, [connectPartnerId, mode]);

  useEffect(() => {
    if (!selectedLeadId || mode !== "leads") return;
    fetchLeadActivities(selectedLeadId, 20).then((acts) =>
      setActivities(acts.reverse()),
    );
  }, [selectedLeadId, mode]);

  if (mode === "visits") {
    const today = new Date().toISOString().slice(0, 10);
    const pending = visits.filter((v) => v.status === "pending_approval");
    const todayVisits = visits.filter(
      (v) => v.visit_date === today && ["scheduled", "accepted"].includes(v.status),
    );
    const scheduled = visits.filter((v) =>
      ["scheduled", "accepted"].includes(v.status),
    );

    if (visits.length === 0) {
      return (
        <p className="text-sm text-muted">
          No site visits for your assigned buyers yet.
        </p>
      );
    }

    const renderVisit = (v: ConnectSiteVisitRow, actions?: boolean) => {
      const buyer = v.buyer;
      const contactVisible = ["scheduled", "accepted", "completed"].includes(v.status);

      return (
        <li key={v.id} className="px-5 py-4">
          <p className="font-medium text-heading-primary">
            {v.property?.title ?? "Property visit"}
          </p>
          <p className="mt-1 text-sm text-body">
            {v.visit_date} · {String(v.visit_time).slice(0, 5)}
          </p>
          <div className="mt-2">
            <BuyerContactLine buyer={buyer} />
          </div>
          {v.purpose ? (
            <p className="mt-1 text-xs text-muted">Visit purpose: {v.purpose}</p>
          ) : null}
          <span className="mt-2 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs">
            {formatVisitStatusLabel(v.status)}
          </span>
          {contactVisible && buyer?.phone ? (
            <p className="mt-2 text-xs text-emerald-700">📞 {buyer.phone}</p>
          ) : null}
          {actions ? (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="rounded-lg border px-3 py-1 text-xs font-semibold"
                onClick={() => manageSiteVisit(v.id, "accept").then(() =>
                  fetchAssignedConnectSiteVisits(connectPartnerId).then(setVisits),
                )}
              >
                Accept
              </button>
              <button
                type="button"
                className="rounded-lg border px-3 py-1 text-xs font-semibold"
                onClick={() => manageSiteVisit(v.id, "reject").then(() =>
                  fetchAssignedConnectSiteVisits(connectPartnerId).then(setVisits),
                )}
              >
                Reject
              </button>
            </div>
          ) : null}
        </li>
      );
    };

    return (
      <div className="space-y-6">
        <section>
          <h4 className="mb-2 text-sm font-semibold">Pending Visits ({pending.length})</h4>
          <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white">
            {pending.length === 0 ? (
              <li className="px-5 py-4 text-sm text-muted">None</li>
            ) : (
              pending.map((v) => renderVisit(v, true))
            )}
          </ul>
        </section>
        <section>
          <h4 className="mb-2 text-sm font-semibold">Today&apos;s Visits ({todayVisits.length})</h4>
          <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white">
            {todayVisits.length === 0 ? (
              <li className="px-5 py-4 text-sm text-muted">None today</li>
            ) : (
              todayVisits.map((v) => renderVisit(v))
            )}
          </ul>
        </section>
        <section>
          <h4 className="mb-2 text-sm font-semibold">Accepted / Scheduled ({scheduled.length})</h4>
          <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white">
            {scheduled.map((v) => renderVisit(v))}
          </ul>
        </section>
      </div>
    );
  }

  if (mode === "properties") {
    if (properties.length === 0) {
      return (
        <p className="text-sm text-muted">No assigned properties yet.</p>
      );
    }
    return (
      <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white">
        {properties.map((p) => (
          <li key={p.id} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="font-medium text-heading-primary">{p.title}</p>
              <p className="text-sm text-muted">{p.city}</p>
            </div>
            <span className="text-xs capitalize text-muted">{p.status}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (leads.length === 0) {
    return (
      <p className="text-sm text-muted">
        No assigned buyers yet. Master will assign leads to you.
      </p>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ul className="max-h-96 space-y-2 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-3">
        {leads.map((lead) => (
          <li key={lead.id}>
            <button
              type="button"
              onClick={() => setSelectedLeadId(lead.id)}
              className={`w-full rounded-xl px-4 py-3 text-left ${
                selectedLeadId === lead.id ? "bg-emerald-50 ring-1 ring-emerald-200" : "hover:bg-neutral-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-heading-primary">
                  {lead.buyer?.full_name ?? "Buyer"}
                </p>
                <LeadStatusBadge status={lead.status} />
              </div>
              <p className="mt-1 text-xs text-muted">{lead.buyer?.phone ?? lead.buyer?.email}</p>
            </button>
          </li>
        ))}
      </ul>
      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        {selectedLeadId ? (
          <>
            <BuyerProfileGrid
              buyer={leads.find((l) => l.id === selectedLeadId)?.buyer}
              className="mb-4"
            />
            <h4 className="mb-3 text-sm font-semibold text-heading-secondary">Activity Timeline</h4>
            <ActivityTimeline activities={activities} maxItems={15} />
          </>
        ) : null}
      </div>
    </div>
  );
}
