import { supabase } from "@/lib/supabase";
import type { LeadStatus } from "@/lib/crm/types";

export async function updateConnectLeadStatus(
  leadId: string,
  status: LeadStatus,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/crm/partner-action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "status", leadId, status }),
  });

  if (!res.ok) {
    const { error } = await supabase
      .from("crm_leads")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", leadId);

    if (error) {
      console.error("updateConnectLeadStatus:", error.message);
      return { ok: false, error: error.message };
    }
  }

  return { ok: true };
}

export async function addConnectLeadNote(
  leadId: string,
  note: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/crm/partner-action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "note", leadId, note }),
  });

  if (!res.ok) {
    const { error } = await supabase.from("crm_lead_activities").insert({
      lead_id: leadId,
      activity_type: "status_changed",
      title: "Partner note added",
      description: note,
    });
    if (error) {
      console.error("addConnectLeadNote:", error.message);
      return { ok: false, error: error.message };
    }
  }

  return { ok: true };
}

export async function logPartnerChannel(
  leadId: string,
  channel: "call" | "whatsapp" | "email",
): Promise<{ ok: boolean }> {
  const res = await fetch("/api/crm/partner-action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leadId, action: channel }),
  });
  return { ok: res.ok };
}
