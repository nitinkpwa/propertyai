export const BUYING_PURPOSE_OPTIONS = [
  { value: "self", label: "Self Use", icon: "🏠" },
  { value: "investment", label: "Investment", icon: "📈" },
  { value: "rental_income", label: "Rental Income", icon: "💰" },
  { value: "family", label: "Family", icon: "👨‍👩‍👧" },
] as const;

export const BUYING_TIMELINE_OPTIONS = [
  { value: "immediate", label: "Immediately" },
  { value: "15_days", label: "Within 15 Days" },
  { value: "1_month", label: "Within 1 Month" },
  { value: "3_months", label: "Within 3 Months" },
  { value: "6_months", label: "Within 6 Months" },
  { value: "exploring", label: "Just Exploring" },
] as const;

export const LOAN_STATUS_OPTIONS = [
  { value: "need_loan", label: "Need Loan", icon: "🏦" },
  { value: "approved", label: "Loan Approved", icon: "✅" },
  { value: "no_loan", label: "Self Funded", icon: "💵" },
] as const;

export const PROPERTY_TYPE_OPTIONS = [
  { value: "flat", label: "Apartment" },
  { value: "builder_floor", label: "Builder Floor" },
  { value: "house", label: "Villa" },
  { value: "plot", label: "Plot" },
  { value: "commercial", label: "Commercial" },
  { value: "office", label: "Office" },
] as const;

export const PREFERRED_AREA_OPTIONS = [
  "Mohali",
  "Chandigarh",
  "Panchkula",
  "Zirakpur",
  "Kharar",
  "New Chandigarh",
  "Aerocity",
  "Derabassi",
  "Landran",
  "Sector 82 Mohali",
  "IT City Mohali",
] as const;

export type ProfileFieldKey =
  | "buying_purpose"
  | "budget"
  | "buying_timeline"
  | "loan_status"
  | "preferred_property_types"
  | "preferred_locations"
  | "occupation"
  | "family_size"
  | "buyer_notes";

export const PROFILE_FIELD_LABELS: Record<ProfileFieldKey, string> = {
  buying_purpose: "Buying Purpose",
  budget: "Budget Range",
  buying_timeline: "Purchase Timeline",
  loan_status: "Loan Status",
  preferred_property_types: "Preferred Property Types",
  preferred_locations: "Preferred Areas",
  occupation: "Occupation",
  family_size: "Family Size",
  buyer_notes: "Additional Notes",
};

export const ACTION_FIELD_PRIORITY: Record<string, ProfileFieldKey[]> = {
  save_property: ["preferred_property_types", "budget", "preferred_locations", "buying_purpose"],
  ai_chat: ["buying_purpose", "budget", "preferred_locations", "buying_timeline"],
  contact_seller: ["budget", "buying_timeline", "loan_status", "buying_purpose"],
  site_visit: ["buying_timeline", "loan_status", "budget", "buying_purpose"],
  inquiry: ["budget", "buying_timeline", "loan_status", "preferred_locations"],
  default: [
    "buying_purpose",
    "budget",
    "buying_timeline",
    "loan_status",
    "preferred_property_types",
    "preferred_locations",
    "occupation",
    "family_size",
  ],
};

export function labelForPurpose(value?: string | null): string {
  return BUYING_PURPOSE_OPTIONS.find((o) => o.value === value)?.label ?? value ?? "—";
}

export function labelForTimeline(value?: string | null): string {
  return BUYING_TIMELINE_OPTIONS.find((o) => o.value === value)?.label ?? value ?? "—";
}

export function labelForLoan(value?: string | null): string {
  return LOAN_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value ?? "—";
}

export function labelForPropertyTypes(values?: string[] | null): string {
  if (!values?.length) return "";
  return values
    .map((v) => PROPERTY_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v)
    .join(", ");
}
