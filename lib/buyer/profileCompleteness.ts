import type { Profile } from "@/lib/supabase";
import {
  ACTION_FIELD_PRIORITY,
  type ProfileFieldKey,
} from "./profileFields";

export interface ProfileCompletenessResult {
  percent: number;
  missing: ProfileFieldKey[];
  filled: ProfileFieldKey[];
  isComplete: boolean;
}

const FIELD_WEIGHTS: Record<ProfileFieldKey, number> = {
  buying_purpose: 12,
  budget: 18,
  buying_timeline: 12,
  loan_status: 10,
  preferred_property_types: 12,
  preferred_locations: 16,
  occupation: 8,
  family_size: 7,
  buyer_notes: 5,
};

function isFieldFilled(profile: Partial<Profile>, field: ProfileFieldKey): boolean {
  switch (field) {
    case "buying_purpose":
      return Boolean(profile.buying_purpose);
    case "budget":
      return profile.budget_min != null || profile.budget_max != null;
    case "buying_timeline":
      return Boolean(profile.buying_timeline);
    case "loan_status":
      return Boolean(profile.loan_status);
    case "preferred_property_types":
      return (profile.preferred_property_types?.length ?? 0) > 0;
    case "preferred_locations":
      return (profile.preferred_locations?.length ?? 0) > 0;
    case "occupation":
      return Boolean(profile.occupation?.trim());
    case "family_size":
      return profile.family_size != null && profile.family_size > 0;
    case "buyer_notes":
      return Boolean(profile.buyer_notes?.trim());
    default:
      return false;
  }
}

export function getProfileCompleteness(
  profile: Partial<Profile> | null | undefined,
): ProfileCompletenessResult {
  if (!profile) {
    return { percent: 0, missing: Object.keys(FIELD_WEIGHTS) as ProfileFieldKey[], filled: [], isComplete: false };
  }

  const filled: ProfileFieldKey[] = [];
  const missing: ProfileFieldKey[] = [];
  let score = 0;

  for (const [field, weight] of Object.entries(FIELD_WEIGHTS) as [ProfileFieldKey, number][]) {
    if (isFieldFilled(profile, field)) {
      filled.push(field);
      score += weight;
    } else {
      missing.push(field);
    }
  }

  const baseIdentity =
    (profile.full_name?.trim() ? 4 : 0) + (profile.phone?.trim() ? 4 : 0);
  const percent = Math.min(100, score + baseIdentity);

  return {
    percent,
    missing,
    filled,
    isComplete: percent >= 100,
  };
}

export function getNextMissingField(
  profile: Partial<Profile> | null | undefined,
  action: keyof typeof ACTION_FIELD_PRIORITY = "default",
): ProfileFieldKey | null {
  const { missing } = getProfileCompleteness(profile);
  if (missing.length === 0) return null;

  const priority = ACTION_FIELD_PRIORITY[action] ?? ACTION_FIELD_PRIORITY.default;
  for (const field of priority) {
    if (missing.includes(field)) return field;
  }
  return missing[0] ?? null;
}

export function shouldPromptProfile(
  profile: Partial<Profile> | null | undefined,
  action: keyof typeof ACTION_FIELD_PRIORITY = "default",
): boolean {
  const { percent } = getProfileCompleteness(profile);
  if (percent >= 100) return false;
  return getNextMissingField(profile, action) !== null;
}
