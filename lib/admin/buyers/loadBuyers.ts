import {
  ADMIN_CRM_LEAD_SELECT,
  getBuyerProfileForCRM,
} from "@/lib/crm/buyerProfile";
import { calculateLeadScore } from "@/lib/crm/leadScore";
import type { LeadStatus } from "@/lib/crm/types";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Profile } from "@/lib/supabase";
import { buildSummaryFromParts } from "../leads/loadLeadProfile";
import { mapCrmStage, mapInquiryStage, mapLeadSource, resolveManagerName } from "../leads/mappers";
import type { AdminLeadSummary } from "../leads/types";

export interface AdminBuyerRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  role: string;
}

export interface AdminBuyersLoadResult {
  buyers: AdminBuyerRow[];
  leads: AdminLeadSummary[];
  count: number;
}

function toBuyerRow(profile: Profile): AdminBuyerRow {
  return {
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    created_at: profile.created_at,
    role: profile.role,
  };
}

function logZeroBuyersDiagnostic(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  errorMessage?: string,
) {
  void supabase
    .from("profiles")
    .select("id, role, email, full_name")
    .order("created_at", { ascending: false })
    .then(({ data, error }) => {
      const roleCounts: Record<string, number> = {};
      for (const row of data ?? []) {
        const role = (row.role as string) || "unknown";
        roleCounts[role] = (roleCounts[role] ?? 0) + 1;
      }

      console.warn("[loadAdminBuyersFromProfiles] Zero buyers returned for query:", {
        sql: "select * from profiles where role = 'buyer' order by created_at desc",
        filterError: errorMessage ?? null,
        diagnosticError: error?.message ?? null,
        totalProfilesSampled: data?.length ?? 0,
        roleCounts,
        sampleProfiles: (data ?? []).slice(0, 10).map((row) => ({
          id: row.id,
          role: row.role,
          email: row.email,
          full_name: row.full_name,
        })),
      });
    });
}

export async function loadAdminBuyersFromProfiles(): Promise<AdminBuyersLoadResult> {
  const supabase = createSupabaseServiceClient();

  const { data: profiles, error, count } = await supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .eq("role", "buyer")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[loadAdminBuyersFromProfiles] Query failed:", error.message);
    throw new Error(error.message);
  }

  const buyerProfiles = (profiles ?? []) as Profile[];

  if (buyerProfiles.length === 0) {
    logZeroBuyersDiagnostic(supabase);
    return { buyers: [], leads: [], count: count ?? 0 };
  }

  const buyerIds = buyerProfiles.map((profile) => profile.id);
  const { data: crmRows, error: crmError } = await supabase
    .from("crm_leads")
    .select(ADMIN_CRM_LEAD_SELECT)
    .in("buyer_id", buyerIds);

  if (crmError) {
    console.error("[loadAdminBuyersFromProfiles] CRM batch load failed:", crmError.message);
  }

  const crmByBuyerId = new Map(
    (crmRows ?? []).map((row) => [row.buyer_id as string, row]),
  );

  const buyers = buyerProfiles.map(toBuyerRow);
  const leads: AdminLeadSummary[] = buyerProfiles.map((profile) => {
    const crmLead = crmByBuyerId.get(profile.id);
    const crmStatus = (crmLead?.status as LeadStatus) ?? null;
    const buyer = getBuyerProfileForCRM(profile, { status: crmStatus });
    const leadScore = calculateLeadScore({ profile: buyer });
    const connect = crmLead?.connect as
      | { full_name?: string | null; company?: string | null }
      | null
      | undefined;

    const stage = crmStatus ? mapCrmStage(crmStatus) : mapInquiryStage(null);

    return buildSummaryFromParts({
      buyerId: profile.id,
      crmLeadId: (crmLead?.id as string) ?? null,
      buyer,
      stage,
      source: mapLeadSource({
        leadSource: crmLead ? "CRM" : "Organic",
        hasAiChat: false,
      }),
      assignedManager: resolveManagerName(connect ?? null),
      assignedManagerId: (crmLead?.assigned_connect_id as string) ?? null,
      lastActivity: null,
      createdAt: profile.created_at,
      signupDate: profile.created_at,
      nextFollowUp: null,
      unreadMessages: 0,
      primaryPropertyTitle: (crmLead?.property as { title?: string } | null)?.title ?? null,
      leadSource: crmLead ? "CRM" : "Organic",
      leadScore,
    });
  });

  return {
    buyers,
    leads,
    count: count ?? buyers.length,
  };
}
