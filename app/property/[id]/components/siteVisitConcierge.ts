export const VISIT_TIMES = ["10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"] as const;

export const VISIT_TIME_GROUPS = [
  { id: "morning", label: "Morning", times: ["10:00", "11:00", "12:00"] as const },
  { id: "afternoon", label: "Afternoon", times: ["14:00", "15:00", "16:00"] as const },
  { id: "evening", label: "Evening", times: ["17:00", "18:00"] as const },
] as const;

export const PURPOSE_CHIPS = [
  "Investment",
  "Self Use",
  "Compare Projects",
  "First Home",
  "Commercial",
  "Loan Assistance",
  "NRI",
  "Other",
] as const;

export const VISITOR_OPTIONS = [
  "Just Me",
  "Couple",
  "Family",
  "Friends",
  "Business Partner",
] as const;

export const LANGUAGE_OPTIONS = ["English", "Hindi", "Punjabi"] as const;

export const TRANSPORT_OPTIONS = ["Own Car", "Need Pickup", "Cab", "Not Sure"] as const;

export const INCLUDED_ITEMS = [
  "Builder Representative",
  "AreaIQ Advisor",
  "Floor Plan Walkthrough",
  "Payment Plan Discussion",
  "Loan Guidance (optional)",
  "Price Negotiation Support",
] as const;

export const NEXT_STEPS = [
  "Builder receives request",
  "AreaIQ verifies availability",
  "WhatsApp confirmation",
  "Site Visit",
  "Negotiation Assistance",
] as const;

export type PurposeChip = (typeof PURPOSE_CHIPS)[number];
export type VisitorOption = (typeof VISITOR_OPTIONS)[number];
export type LanguageOption = (typeof LANGUAGE_OPTIONS)[number];
export type TransportOption = (typeof TRANSPORT_OPTIONS)[number];

export type AvailabilityStatus = "available" | "limited" | "unavailable" | "loading";

export interface AiRecommendedSlot {
  dateIso: string;
  time: string;
  dayLabel: string;
  timeLabel: string;
  reasons: string[];
}

export function formatTimeLabel(t: string): string {
  const hour = Number(t.slice(0, 2));
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:${t.slice(3, 5) || "00"} ${ampm}`;
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDayLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-IN", { weekday: "long" });
}

export function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

/** Next Saturday at 11:00 — premium default when live calendar data is unavailable. */
export function getAiRecommendedSlot(from = new Date()): AiRecommendedSlot | null {
  const d = new Date(from);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilSaturday);
  const dateIso = toIsoDate(d);
  return {
    dateIso,
    time: "11:00",
    dayLabel: formatDayLabel(dateIso),
    timeLabel: formatTimeLabel("11:00"),
    reasons: [
      "Lowest traffic",
      "Builder sales manager available",
      "Model apartment open",
    ],
  };
}

export function getNextAvailableSlot(from = new Date()): { dateIso: string; time: string; label: string } {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  // Skip Sunday for a calmer default
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  const dateIso = toIsoDate(d);
  return {
    dateIso,
    time: "11:00",
    label: `${formatShortDate(dateIso)} · ${formatTimeLabel("11:00")}`,
  };
}

export function formatReferenceId(visitId: string): string {
  const compact = visitId.replace(/-/g, "").toUpperCase();
  return `AQ-${compact.slice(0, 8)}`;
}

export function buildPurposePayload(input: {
  purposeChip: string;
  purposeCustom: string;
  visitors: string;
  loanAssist: "" | "yes" | "no";
  language: string;
  transport: string;
  buyerNotes?: string;
}): string | undefined {
  const parts: string[] = [];
  const purpose =
    input.purposeChip === "Other"
      ? input.purposeCustom.trim()
      : input.purposeChip || input.purposeCustom.trim();
  if (purpose) parts.push(purpose);
  if (input.buyerNotes?.trim()) parts.push(`Notes: ${input.buyerNotes.trim()}`);
  if (input.visitors) parts.push(`Visitors: ${input.visitors}`);
  if (input.loanAssist === "yes") parts.push("Home loan assistance: Yes");
  if (input.loanAssist === "no") parts.push("Home loan assistance: No");
  if (input.language) parts.push(`Language: ${input.language}`);
  if (input.transport) parts.push(`Arrival: ${input.transport}`);
  return parts.length ? parts.join(" · ") : undefined;
}

export function friendlyBookingError(
  code: string | undefined,
  fallback: string,
): { availability?: AvailabilityStatus; message: string } {
  switch (code) {
    case "SITE_VISITS_DISABLED":
      return {
        availability: "unavailable",
        message: fallback || "Site visits are temporarily unavailable for this property.",
      };
    case "PROPERTY_UNAVAILABLE":
      return {
        availability: "unavailable",
        message: fallback || "Selected property not found.",
      };
    case "SCHEMA_NOT_READY":
      return {
        availability: "unavailable",
        message: fallback || "Site visit booking is not configured yet.",
      };
    case "DUPLICATE_VISIT":
      return {
        availability: "limited",
        message: fallback || "You already have an active visit request for this property.",
      };
    case "UNAUTHORIZED":
      return {
        message: fallback || "Please sign in to request a property visit.",
      };
    case "BUYER_NOT_BUYER_ROLE":
      return {
        message: fallback || "Please continue as a Buyer to book a site visit.",
      };
    case "PERMISSION_DENIED":
      return {
        message: fallback || "Database permission denied.",
      };
    case "MISSING_PHONE":
      return {
        message: fallback || "Missing phone number. Please add a phone number to your profile.",
      };
    case "NETWORK":
      return {
        message: "Connection lost. Please check your network and try again.",
      };
    default:
      // Never replace a specific server message with a generic one
      return {
        message:
          fallback && fallback !== "An unexpected error occurred. Please try again."
            ? fallback
            : "We couldn’t submit your request. Check the error details and try again.",
      };
  }
}

export function computeProgressStep(input: {
  visitDate: string;
  visitTime: string;
  purposeChip: string;
  purposeCustom: string;
  buyerNotes?: string;
}): 1 | 2 | 3 | 4 {
  if (!input.visitDate) return 1;
  if (!input.visitTime) return 2;
  const purposeReady =
    Boolean(input.purposeChip && input.purposeChip !== "Other") ||
    Boolean(input.purposeCustom.trim()) ||
    Boolean(input.buyerNotes?.trim());
  if (!purposeReady) return 3;
  return 4;
}
