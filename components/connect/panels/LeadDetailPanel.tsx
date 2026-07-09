"use client";

import { useState } from "react";
import ActivityTimeline from "@/components/crm/ActivityTimeline";
import LeadTemperatureBadge from "@/components/premium/LeadTemperatureBadge";
import type { ConnectPartnerBuyerRow } from "@/lib/connect/partners/types";
import { connectTokens, formatBudget } from "@/lib/connect/design";
import { updateConnectLeadStatus } from "@/lib/connect/partners/leads";
import type { CrmLeadActivity, LeadStatus } from "@/lib/crm/types";
import { LEAD_STATUS_LABELS } from "@/lib/crm/constants";

const STATUSES: LeadStatus[] = [
  "new", "ai_qualified", "interested", "property_saved", "inquiry_sent",
  "visit_scheduled", "visited", "negotiation", "booked", "completed", "lost",
];

interface LeadDetailData {
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
}

interface Props {
  lead: ConnectPartnerBuyerRow;
  detail: LeadDetailData | null;
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void | Promise<void>;
}

export default function LeadDetailPanel({ lead, detail, loading, onClose, onRefresh }: Props) {
  const [note, setNote] = useState("");
  const [followDate, setFollowDate] = useState("");
  const [followAction, setFollowAction] = useState("Call buyer");
  const [acting, setActing] = useState(false);

  const logAction = async (action: string, extra?: Record<string, unknown>) => {
    if (!lead.lead_id) return;
    setActing(true);
    await fetch("/api/crm/partner-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead.lead_id, action, ...extra }),
    });
    setActing(false);
    await onRefresh();
  };

  const handleStatusChange = async (status: LeadStatus) => {
    if (!lead.lead_id) return;
    await updateConnectLeadStatus(lead.lead_id, status);
    await onRefresh();
  };

  const intel = detail?.intelligence;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-neutral-900/40">
      <div className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">{lead.full_name ?? "Lead Detail"}</h2>
            <p className="text-sm text-emerald-700">{lead.property_title ?? "Property lead"}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100">
            ✕
          </button>
        </div>

        <div className="space-y-6 p-5">
          <div className="flex items-center gap-3">
            <LeadTemperatureBadge
              temperature={intel?.lead_temperature ?? lead.lead_temperature}
              score={intel?.lead_score ?? lead.lead_score}
            />
            {intel ? (
              <span className="text-xs text-neutral-500">
                {intel.conversion_probability}% conversion probability
              </span>
            ) : null}
          </div>

          {intel ? (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Engagement", value: intel.engagement_score },
                { label: "Visit Score", value: intel.visit_score },
                { label: "Interest", value: intel.interest_score },
                { label: "Budget Match", value: intel.budget_match_score },
              ].map((m) => (
                <div key={m.label} className="rounded-xl bg-neutral-50 p-3">
                  <p className="text-xs text-neutral-400">{m.label}</p>
                  <p className="text-lg font-bold text-neutral-900">{m.value}%</p>
                </div>
              ))}
            </div>
          ) : null}

          {intel?.next_action ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-800">Next Action</p>
              <p className="text-sm text-amber-900">{intel.next_action}</p>
            </div>
          ) : null}

          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div><dt className="text-neutral-400">Phone</dt><dd className="font-medium">{lead.phone ?? "—"}</dd></div>
            <div><dt className="text-neutral-400">Budget</dt><dd className="font-medium text-emerald-700">{formatBudget(lead.budget_min, lead.budget_max)}</dd></div>
            <div><dt className="text-neutral-400">Purpose</dt><dd className="capitalize">{lead.buying_purpose ?? "—"}</dd></div>
            <div><dt className="text-neutral-400">Timeline</dt><dd className="capitalize">{lead.buying_timeline ?? "—"}</dd></div>
            <div><dt className="text-neutral-400">Source</dt><dd className="capitalize">{lead.lead_source?.replace(/_/g, " ") ?? "—"}</dd></div>
            <div><dt className="text-neutral-400">Visit</dt><dd className="capitalize">{lead.visit_status?.replace(/_/g, " ") ?? "—"}</dd></div>
          </dl>

          <div className="flex flex-wrap gap-2">
            {lead.phone ? (
              <>
                <button type="button" disabled={acting} onClick={() => logAction("call")} className={connectTokens.btnPrimary + " text-xs"}>Log Call</button>
                <button type="button" disabled={acting} onClick={() => logAction("whatsapp")} className={connectTokens.btnSecondary + " text-xs"}>Log WhatsApp</button>
              </>
            ) : null}
            {lead.email ? (
              <button type="button" disabled={acting} onClick={() => logAction("email")} className={connectTokens.btnSecondary + " text-xs"}>Log Email</button>
            ) : null}
          </div>

          <div>
            <label className="text-xs text-neutral-500">Pipeline Stage</label>
            <select
              value={lead.lead_status ?? "new"}
              onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 rounded-xl border border-neutral-100 p-4">
            <p className="text-sm font-semibold">Schedule Follow-up</p>
            <input
              type="datetime-local"
              value={followDate}
              onChange={(e) => setFollowDate(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
            <input
              value={followAction}
              onChange={(e) => setFollowAction(e.target.value)}
              placeholder="Follow-up action"
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={acting || !followDate}
              onClick={() =>
                logAction("follow_up", {
                  dueAt: new Date(followDate).toISOString(),
                  followAction,
                })
              }
              className={connectTokens.btnPrimary + " w-full text-xs"}
            >
              Schedule Follow-up
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Add Note</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              rows={3}
            />
            <button
              type="button"
              disabled={acting || !note.trim()}
              onClick={() => logAction("note", { note: note.trim() }).then(() => setNote(""))}
              className={connectTokens.btnSecondary + " text-xs"}
            >
              Save Note
            </button>
          </div>

          {detail?.followUps && detail.followUps.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-semibold">Upcoming Follow-ups</p>
              <ul className="space-y-2">
                {detail.followUps.map((fu) => (
                  <li key={fu.id as string} className="rounded-lg bg-neutral-50 px-3 py-2 text-xs">
                    <span className="font-medium">{fu.action as string}</span>
                    <span className="ml-2 text-neutral-400">
                      {new Date(fu.due_at as string).toLocaleString("en-IN")}
                    </span>
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      fu.status === "overdue" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {fu.status as string}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <p className="mb-3 text-sm font-semibold">CRM Timeline</p>
            {loading ? (
              <p className="text-sm text-neutral-400">Loading timeline...</p>
            ) : detail?.activities?.length ? (
              <ActivityTimeline activities={detail.activities} />
            ) : (
              <p className="text-sm text-neutral-400">No activities yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
