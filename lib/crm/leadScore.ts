import type { Profile } from "@/lib/supabase";
import type { BuyerProfileForCRM } from "@/lib/crm/buyerProfile";

export type LeadTemperature = "cold" | "warm" | "hot";

export interface LeadScoreInput {
  profile?: Partial<Profile> | BuyerProfileForCRM | null;
  savedCount?: number;
  viewedCount?: number;
  chatCount?: number;
  visitCount?: number;
  inquiryCount?: number;
}

export interface LeadScoreResult {
  score: number;
  temperature: LeadTemperature;
  factors: string[];
}

export function calculateLeadScore(input: LeadScoreInput): LeadScoreResult {
  let score = 0;
  const factors: string[] = [];
  const p = input.profile;

  if (p?.budget_min != null || p?.budget_max != null) {
    score += 20;
    factors.push("Budget filled");
  }

  if (p?.loan_status === "approved") {
    score += 15;
    factors.push("Loan approved");
  } else if (p?.loan_status === "need_loan") {
    score += 5;
  }

  if (p?.buying_timeline === "immediate" || p?.buying_timeline === "15_days") {
    score += 20;
    factors.push("Immediate timeline");
  } else if (p?.buying_timeline === "1_month") {
    score += 12;
  }

  if ((input.chatCount ?? 0) >= 2) {
    score += 15;
    factors.push("Multiple AI chats");
  } else if ((input.chatCount ?? 0) >= 1) {
    score += 8;
  }

  if ((input.savedCount ?? 0) >= 2) {
    score += 12;
    factors.push("Saved properties");
  } else if ((input.savedCount ?? 0) >= 1) {
    score += 6;
  }

  if ((input.visitCount ?? 0) >= 1) {
    score += 18;
    factors.push("Site visit booked");
  }

  if (p?.buying_purpose) score += 5;
  if ((p?.preferred_locations?.length ?? 0) > 0) score += 5;

  const temperature: LeadTemperature =
    score >= 65 ? "hot" : score >= 35 ? "warm" : "cold";

  return { score: Math.min(100, score), temperature, factors };
}

export function temperatureLabel(t: LeadTemperature): string {
  return t === "hot" ? "HOT" : t === "warm" ? "WARM" : "COLD";
}

export function temperatureStyles(t: LeadTemperature): string {
  if (t === "hot") return "bg-rose-50 text-rose-700 ring-rose-200/80";
  if (t === "warm") return "bg-amber-50 text-amber-700 ring-amber-200/80";
  return "bg-sky-50 text-sky-700 ring-sky-200/80";
}
