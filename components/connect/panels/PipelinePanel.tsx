"use client";

import { useMemo, useState } from "react";
import type { ConnectPartnerBuyerRow } from "@/lib/connect/partners/types";
import { PIPELINE_STAGES, connectTokens } from "@/lib/connect/design";
import { updateConnectLeadStatus } from "@/lib/connect/partners/leads";
import type { LeadStatus } from "@/lib/crm/types";

interface Props {
  leads: ConnectPartnerBuyerRow[];
  onRefresh: () => void;
}

function mapToPipelineStage(status: string | null): string {
  if (!status) return "new";
  const map: Record<string, string> = {
    inquiry_sent: "new",
    property_saved: "interested",
    property_suggested: "interested",
    ai_qualified: "ai_qualified",
    visit_scheduled: "visit_scheduled",
    visited: "visited",
    negotiation: "negotiation",
    booked: "booked",
    completed: "completed",
    lost: "lost",
  };
  return map[status] ?? status;
}

export default function PipelinePanel({ leads, onRefresh }: Props) {
  const [dragging, setDragging] = useState<string | null>(null);

  const columns = useMemo(() => {
    const cols: Record<string, ConnectPartnerBuyerRow[]> = {};
    for (const stage of PIPELINE_STAGES) cols[stage.id] = [];
    for (const lead of leads) {
      const stage = mapToPipelineStage(lead.lead_status);
      if (cols[stage]) cols[stage].push(lead);
      else cols.new.push(lead);
    }
    return cols;
  }, [leads]);

  const handleDrop = async (stageId: string) => {
    if (!dragging) return;
    const lead = leads.find((l) => l.id === dragging);
    if (lead?.lead_id) {
      await updateConnectLeadStatus(lead.lead_id, stageId as LeadStatus);
      onRefresh();
    }
    setDragging(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className={connectTokens.heading}>Lead Pipeline</h2>
        <p className={connectTokens.subheading}>Drag leads between stages — timeline updates automatically</p>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => (
          <div
            key={stage.id}
            className="w-64 shrink-0 rounded-2xl border border-neutral-200 bg-neutral-50/50"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(stage.id)}
          >
            <div className={`rounded-t-2xl px-3 py-2 text-xs font-bold ring-1 ring-inset ${stage.color}`}>
              {stage.label} ({columns[stage.id]?.length ?? 0})
            </div>
            <div className="space-y-2 p-2 min-h-[200px]">
              {(columns[stage.id] ?? []).map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => setDragging(lead.id)}
                  className={`${connectTokens.card} cursor-grab p-3 active:cursor-grabbing`}
                >
                  <p className="text-sm font-semibold text-neutral-900">{lead.full_name ?? "Buyer"}</p>
                  <p className="mt-0.5 truncate text-xs text-neutral-500">{lead.property_title}</p>
                  <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${lead.lead_temperature === "hot" ? "bg-rose-100 text-rose-700" : "bg-neutral-100 text-neutral-600"}`}>
                    {lead.lead_temperature}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
