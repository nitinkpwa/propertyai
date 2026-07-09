"use client";

import { useState } from "react";
import LeadTemperatureBadge from "@/components/premium/LeadTemperatureBadge";
import LeadDetailPanel from "@/components/connect/panels/LeadDetailPanel";
import type { ConnectPartnerBuyerRow } from "@/lib/connect/partners/types";
import type { CrmLeadActivity } from "@/lib/crm/types";
import { connectTokens, formatBudget } from "@/lib/connect/design";
import { updateConnectLeadStatus, addConnectLeadNote } from "@/lib/connect/partners/leads";
import type { LeadStatus } from "@/lib/crm/types";
import ConnectEmptyModule from "@/app/connect/components/ConnectEmptyModule";

const STATUSES: LeadStatus[] = [
  "new", "interested", "ai_qualified", "visit_scheduled", "visited", "negotiation", "booked", "completed", "lost",
];

interface Props {
  leads: ConnectPartnerBuyerRow[];
  onRefresh: () => void;
}

export default function PropertyLeadsPanel({ leads, onRefresh }: Props) {
  const [noteLead, setNoteLead] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState<"all" | "hot" | "warm" | "cold">("all");
  const [selectedLead, setSelectedLead] = useState<ConnectPartnerBuyerRow | null>(null);
  const [leadDetail, setLeadDetail] = useState<{
    activities: CrmLeadActivity[];
    followUps: Array<Record<string, unknown>>;
    intelligence: {
      lead_score: number;
      lead_temperature: "hot" | "warm" | "cold";
      engagement_score: number;
      visit_score: number;
      interest_score: number;
      budget_match_score: number;
      conversion_probability: number;
      next_action: string | null;
    };
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openLeadDetail = async (lead: ConnectPartnerBuyerRow) => {
    setSelectedLead(lead);
    if (!lead.lead_id) {
      setLeadDetail(null);
      return;
    }
    setDetailLoading(true);
    const res = await fetch(`/api/crm/leads/${lead.lead_id}`);
    if (res.ok) {
      const data = await res.json();
      setLeadDetail({
        activities: data.activities ?? [],
        followUps: data.followUps ?? [],
        intelligence: data.intelligence ?? {
          lead_score: lead.lead_score,
          lead_temperature: lead.lead_temperature,
          engagement_score: 0,
          visit_score: 0,
          interest_score: 0,
          budget_match_score: 0,
          conversion_probability: 0,
          next_action: lead.next_action ?? null,
        },
      });
    }
    setDetailLoading(false);
  };

  const filtered = filter === "all" ? leads : leads.filter((l) => l.lead_temperature === filter);

  const handleStatusChange = async (leadId: string | null, status: LeadStatus) => {
    if (!leadId) return;
    await updateConnectLeadStatus(leadId, status);
    onRefresh();
  };

  const handleAddNote = async () => {
    if (!noteLead || !note.trim()) return;
    await addConnectLeadNote(noteLead, note.trim());
    setNote("");
    setNoteLead(null);
    onRefresh();
  };

  if (leads.length === 0) {
    return (
      <ConnectEmptyModule
        icon="👤"
        title="No property leads yet"
        description="When buyers enquire on your assigned properties, leads appear here — each tied to the specific property, not permanently owned by you."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className={connectTokens.heading}>Property Leads</h2>
          <p className={connectTokens.subheading}>{leads.length} leads from your assigned properties</p>
        </div>
        <div className="flex gap-2">
          {(["all", "hot", "warm", "cold"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${filter === f ? "bg-emerald-600 text-white" : "bg-neutral-100 text-neutral-600"}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((lead) => (
          <article key={`${lead.id}-${lead.property_id}`} className={`${connectTokens.card} p-5 cursor-pointer hover:ring-2 hover:ring-emerald-200 transition`} onClick={() => openLeadDetail(lead)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && openLeadDetail(lead)}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-neutral-900">{lead.full_name ?? "Buyer"}</h3>
                <p className="text-sm text-emerald-700">{lead.property_title ?? "Assigned property"}</p>
                <p className="text-xs text-neutral-400">{lead.property_city ?? ""}</p>
              </div>
              <LeadTemperatureBadge temperature={lead.lead_temperature} score={lead.lead_score} />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div><dt className="text-neutral-400">Phone</dt><dd className="font-medium">{lead.phone ?? "—"}</dd></div>
              <div><dt className="text-neutral-400">Email</dt><dd className="font-medium truncate">{lead.email ?? "—"}</dd></div>
              <div><dt className="text-neutral-400">Budget</dt><dd className="font-medium text-emerald-700">{formatBudget(lead.budget_min, lead.budget_max)}</dd></div>
              <div><dt className="text-neutral-400">Purpose</dt><dd className="capitalize">{lead.buying_purpose ?? "—"}</dd></div>
              <div><dt className="text-neutral-400">Timeline</dt><dd className="capitalize">{lead.buying_timeline ?? "—"}</dd></div>
              <div><dt className="text-neutral-400">Source</dt><dd className="capitalize">{lead.lead_source?.replace(/_/g, " ") ?? "Enquiry"}</dd></div>
              <div><dt className="text-neutral-400">Status</dt><dd className="capitalize">{lead.lead_status ?? "new"}</dd></div>
              <div><dt className="text-neutral-400">Visit</dt><dd className="capitalize">{lead.visit_status?.replace(/_/g, " ") ?? "—"}</dd></div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              {lead.phone ? (
                <>
                  <a href={`tel:${lead.phone}`} className={connectTokens.btnPrimary + " text-xs"}>Call</a>
                  <a href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className={connectTokens.btnSecondary + " text-xs"}>WhatsApp</a>
                </>
              ) : null}
              {lead.email ? <a href={`mailto:${lead.email}`} className={connectTokens.btnSecondary + " text-xs"}>Email</a> : null}
              <button type="button" onClick={() => setNoteLead(lead.lead_id)} className={connectTokens.btnSecondary + " text-xs"}>Add Note</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); openLeadDetail(lead); }} className={connectTokens.btnPrimary + " text-xs"}>View CRM</button>
            </div>

            <div className="mt-3">
              <label className="text-xs text-neutral-500">Change status</label>
              <select
                value={lead.lead_status ?? "new"}
                onChange={(e) => handleStatusChange(lead.lead_id, e.target.value as LeadStatus)}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
          </article>
        ))}
      </div>

      {noteLead ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h3 className="font-bold">Add Note</h3>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className="mt-3 w-full rounded-xl border px-3 py-2 text-sm" rows={4} placeholder="Follow-up notes..." />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={handleAddNote} className={connectTokens.btnPrimary}>Save Note</button>
              <button type="button" onClick={() => setNoteLead(null)} className={connectTokens.btnSecondary}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedLead ? (
        <LeadDetailPanel
          lead={selectedLead}
          detail={leadDetail}
          loading={detailLoading}
          onClose={() => { setSelectedLead(null); setLeadDetail(null); }}
          onRefresh={async () => {
            onRefresh();
            if (selectedLead.lead_id) await openLeadDetail(selectedLead);
          }}
        />
      ) : null}
    </div>
  );
}
