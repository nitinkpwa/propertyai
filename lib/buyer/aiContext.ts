import type { Profile } from "@/lib/supabase";
import {
  labelForLoan,
  labelForPurpose,
  labelForTimeline,
} from "./profileFields";

export function buildBuyerProfileContext(profile: Partial<Profile> | null | undefined): string {
  if (!profile) return "";

  const parts: string[] = [];

  if (profile.buying_purpose) {
    parts.push(`Buying purpose: ${labelForPurpose(profile.buying_purpose)}`);
  }
  if (profile.budget_min != null || profile.budget_max != null) {
    const fmt = (n: number) =>
      n >= 10_000_000 ? `₹${(n / 10_000_000).toFixed(1)} Cr` : `₹${(n / 100_000).toFixed(0)} L`;
    if (profile.budget_min != null && profile.budget_max != null) {
      parts.push(`Budget: ${fmt(profile.budget_min)} – ${fmt(profile.budget_max)}`);
    } else if (profile.budget_max != null) {
      parts.push(`Budget: up to ${fmt(profile.budget_max)}`);
    } else if (profile.budget_min != null) {
      parts.push(`Budget: from ${fmt(profile.budget_min)}`);
    }
  }
  if (profile.buying_timeline) {
    parts.push(`Timeline: ${labelForTimeline(profile.buying_timeline)}`);
  }
  if (profile.loan_status) {
    parts.push(`Loan: ${labelForLoan(profile.loan_status)}`);
  }
  if (profile.preferred_locations?.length) {
    parts.push(`Preferred areas: ${profile.preferred_locations.join(", ")}`);
  }
  if (profile.preferred_property_types?.length) {
    parts.push(`Property types: ${profile.preferred_property_types.join(", ")}`);
  }
  if (profile.city) {
    parts.push(`City: ${profile.city}`);
  }

  if (parts.length === 0) return "";

  return `\n\nBUYER PROFILE (use for personalization — do not re-ask unless missing):\n${parts.map((p) => `- ${p}`).join("\n")}`;
}
