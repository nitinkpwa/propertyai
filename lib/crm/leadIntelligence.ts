import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateLeadScore, type LeadTemperature } from "@/lib/crm/leadScore";
import type { LeadStatus } from "@/lib/crm/types";

export interface LeadIntelligence {
  lead_score: number;
  lead_temperature: LeadTemperature;
  engagement_score: number;
  visit_score: number;
  interest_score: number;
  budget_match_score: number;
  conversion_probability: number;
  next_action: string | null;
}

export interface LeadIntelligenceInput {
  buyerId: string;
  leadId: string;
  status: LeadStatus;
  propertyId?: string | null;
  propertyPrice?: number | null;
}

export async function gatherLeadMetrics(
  supabase: SupabaseClient,
  buyerId: string,
  propertyId?: string | null,
  leadId?: string | null,
): Promise<{
  savedCount: number;
  viewedCount: number;
  chatCount: number;
  visitCount: number;
  inquiryCount: number;
  comparedCount: number;
  feedbackPositive: boolean;
  lastActivityAt: string | null;
}> {
  const [saved, viewed, chats, visits, inquiries, compared, activities] = await Promise.all([
    supabase.from("saved_properties").select("id", { count: "exact", head: true }).eq("user_id", buyerId),
    supabase.from("property_views").select("id", { count: "exact", head: true }).eq("user_id", buyerId),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", buyerId),
    supabase.from("site_visits").select("id, status, feedback").eq("user_id", buyerId),
    propertyId
      ? supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("from_user_id", buyerId).eq("property_id", propertyId)
      : supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("from_user_id", buyerId),
    supabase.from("compared_properties").select("id", { count: "exact", head: true }).eq("user_id", buyerId),
    leadId
      ? supabase
          .from("crm_lead_activities")
          .select("created_at, activity_type, metadata")
          .eq("lead_id", leadId)
          .order("created_at", { ascending: false })
          .limit(1)
      : Promise.resolve({ data: [] }),
  ]);

  const visitRows = visits.data ?? [];
  const completedVisits = visitRows.filter((v) => v.status === "completed");
  const feedbackPositive = completedVisits.some((v) => {
    const fb = v.feedback as { wouldBuy?: boolean } | null;
    return fb?.wouldBuy === true;
  });

  return {
    savedCount: saved.count ?? 0,
    viewedCount: viewed.count ?? 0,
    chatCount: chats.count ?? 0,
    visitCount: visitRows.length,
    inquiryCount: inquiries.count ?? 0,
    comparedCount: compared.count ?? 0,
    feedbackPositive,
    lastActivityAt: (activities.data?.[0]?.created_at as string) ?? null,
  };
}

export function computeEngagementScore(metrics: {
  viewedCount: number;
  savedCount: number;
  chatCount: number;
  comparedCount: number;
  inquiryCount: number;
}): number {
  let score = 0;
  if (metrics.viewedCount >= 5) score += 25;
  else if (metrics.viewedCount >= 1) score += 10;
  if (metrics.savedCount >= 2) score += 20;
  else if (metrics.savedCount >= 1) score += 10;
  if (metrics.chatCount >= 2) score += 20;
  else if (metrics.chatCount >= 1) score += 10;
  if (metrics.comparedCount >= 2) score += 15;
  else if (metrics.comparedCount >= 1) score += 8;
  if (metrics.inquiryCount >= 1) score += 20;
  return Math.min(100, score);
}

export function computeVisitScore(visitCount: number, feedbackPositive: boolean): number {
  if (visitCount === 0) return 0;
  let score = 30;
  if (visitCount >= 2) score += 30;
  if (feedbackPositive) score += 40;
  return Math.min(100, score);
}

export function computeInterestScore(status: LeadStatus, feedbackPositive: boolean): number {
  const statusScores: Partial<Record<LeadStatus, number>> = {
    new: 5,
    ai_qualified: 15,
    interested: 25,
    property_saved: 30,
    inquiry_sent: 45,
    visit_scheduled: 55,
    visited: 70,
    negotiation: 85,
    booked: 95,
    completed: 100,
    lost: 0,
  };
  let score = statusScores[status] ?? 10;
  if (feedbackPositive) score = Math.min(100, score + 15);
  return score;
}

export function computeBudgetMatch(
  budgetMin: number | null | undefined,
  budgetMax: number | null | undefined,
  propertyPrice: number | null | undefined,
): number {
  if (!propertyPrice || (budgetMin == null && budgetMax == null)) return 50;
  const min = budgetMin ?? 0;
  const max = budgetMax ?? propertyPrice * 2;
  if (propertyPrice >= min && propertyPrice <= max) return 100;
  const diff = propertyPrice < min ? min - propertyPrice : propertyPrice - max;
  const range = max - min || propertyPrice;
  const pctOff = (diff / range) * 100;
  if (pctOff <= 10) return 75;
  if (pctOff <= 25) return 50;
  if (pctOff <= 40) return 25;
  return 10;
}

export function computeConversionProbability(
  engagement: number,
  visit: number,
  interest: number,
  budgetMatch: number,
  temperature: LeadTemperature,
): number {
  const base = engagement * 0.2 + visit * 0.25 + interest * 0.35 + budgetMatch * 0.2;
  const tempBoost = temperature === "hot" ? 15 : temperature === "warm" ? 5 : 0;
  return Math.min(100, Math.round(base + tempBoost));
}

export function deriveNextAction(status: LeadStatus, metrics: {
  visitCount: number;
  inquiryCount: number;
  feedbackPositive: boolean;
}): string {
  if (status === "lost") return "Archive or re-engage in 30 days";
  if (status === "completed" || status === "booked") return "Complete documentation";
  if (status === "negotiation") return "Follow up on price negotiation";
  if (status === "visited") {
    return metrics.feedbackPositive ? "Schedule negotiation call" : "Address buyer concerns";
  }
  if (status === "visit_scheduled") return "Confirm visit attendance";
  if (metrics.inquiryCount > 0 && metrics.visitCount === 0) return "Schedule site visit";
  if (status === "inquiry_sent") return "Call buyer within 2 hours";
  if (status === "property_saved") return "Send property details via WhatsApp";
  if (status === "ai_qualified" || status === "interested") return "Qualify budget and timeline";
  return "Make first contact attempt";
}

export async function recalculateLeadIntelligence(
  supabase: SupabaseClient,
  input: LeadIntelligenceInput,
): Promise<LeadIntelligence | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("budget_min, budget_max, loan_status, buying_timeline, buying_purpose, preferred_locations")
    .eq("id", input.buyerId)
    .maybeSingle();

  const metrics = await gatherLeadMetrics(supabase, input.buyerId, input.propertyId, input.leadId);

  const baseScore = calculateLeadScore({
    profile: profile ?? undefined,
    savedCount: metrics.savedCount,
    viewedCount: metrics.viewedCount,
    chatCount: metrics.chatCount,
    visitCount: metrics.visitCount,
    inquiryCount: metrics.inquiryCount,
  });

  const engagement_score = computeEngagementScore(metrics);
  const visit_score = computeVisitScore(metrics.visitCount, metrics.feedbackPositive);
  const interest_score = computeInterestScore(input.status, metrics.feedbackPositive);
  const budget_match_score = computeBudgetMatch(
    profile?.budget_min as number | null,
    profile?.budget_max as number | null,
    input.propertyPrice ?? null,
  );
  const conversion_probability = computeConversionProbability(
    engagement_score,
    visit_score,
    interest_score,
    budget_match_score,
    baseScore.temperature,
  );
  const next_action = deriveNextAction(input.status, metrics);

  const intelligence: LeadIntelligence = {
    lead_score: baseScore.score,
    lead_temperature: baseScore.temperature,
    engagement_score,
    visit_score,
    interest_score,
    budget_match_score,
    conversion_probability,
    next_action,
  };

  const { error } = await supabase
    .from("crm_leads")
    .update({
      lead_score: intelligence.lead_score,
      lead_temperature: intelligence.lead_temperature,
      engagement_score: intelligence.engagement_score,
      visit_score: intelligence.visit_score,
      interest_score: intelligence.interest_score,
      budget_match_score: intelligence.budget_match_score,
      conversion_probability: intelligence.conversion_probability,
      next_action: intelligence.next_action,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.leadId);

  if (error) {
    console.error("recalculateLeadIntelligence:", error.message);
    return null;
  }

  return intelligence;
}
