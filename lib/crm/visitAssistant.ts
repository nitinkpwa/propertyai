import type { SiteVisitRow } from "@/lib/buyer/types";
import { buildPropertyChecklist } from "@/lib/crm/visitWorkflow";
import { formatPropertyTitle } from "@/lib/properties/formatPropertyTitle";
import { formatInrAmount } from "@/lib/properties/pricingDisplay";
import { isReraApproved } from "@/lib/properties/reraStatus";

export interface VisitAssistantPhase {
  phase: "before" | "during" | "after";
  data: Record<string, unknown>;
}

export interface BeforeVisitContext {
  propertySummary: {
    title: string;
    builder: string | null;
    area: string | null;
    price: number | null;
    location: string | null;
  };
  pros: string[];
  cons: string[];
  nearby: string[];
  checklist: string[];
  questionsToAsk: string[];
  documentsToVerify: string[];
  marketPriceNote: string;
  aiPreparationTips: string[];
}

export interface DuringVisitContext {
  checklistProgress: Record<string, boolean>;
  notes: string;
  voiceNoteUrls: string[];
  photoUrls: string[];
  ratings: {
    parking: number;
    construction: number;
    builderBehaviour: number;
    amenities: number;
    security: number;
    powerBackup: number;
    water: number;
    connectivity: number;
    nearbySchools: number;
    hospitals: number;
    metro: number;
    traffic: number;
    environment: number;
  };
}

export interface AfterVisitContext {
  feedbackSubmitted: boolean;
  wouldBuy: boolean | null;
  needFollowUp: boolean;
  needAnotherVisit: boolean;
  interested: boolean;
  notInterested: boolean;
  budgetMismatch: boolean;
  builderBehaviourRating: number | null;
  summary: string;
}

const DEFAULT_QUESTIONS = [
  "What is the possession timeline?",
  "Are there any hidden charges or PLC?",
  "What amenities are ready vs planned?",
  "Can I see the actual unit or sample flat?",
  "What is the payment plan and loan tie-ups?",
  "What is the maintenance charge per sq ft?",
  "Is the project RERA registered?",
  "What is the resale policy?",
];

const DEFAULT_DOCUMENTS = [
  "RERA Registration Certificate",
  "Approved Building Plan",
  "Occupancy Certificate (if ready)",
  "Sale Deed Template",
  "Payment Schedule",
  "Allotment Letter Sample",
];

export function buildBeforeVisitContext(visit: SiteVisitRow & {
  property?: {
    title?: string;
    builder_name?: string | null;
    area_sqft?: number | null;
    price?: number | null;
    location?: string | null;
    city?: string | null;
    nearby_places?: Record<string, unknown> | null;
    amenities?: string[] | null;
    type?: string | null;
    rera_number?: string | null;
    parking?: string | null;
  } | null;
}): BeforeVisitContext {
  const prop = visit.property;
  const nearbyRaw = prop?.nearby_places as Record<string, string[]> | null;
  const nearby: string[] = [];
  if (nearbyRaw) {
    for (const [key, vals] of Object.entries(nearbyRaw)) {
      if (Array.isArray(vals)) nearby.push(...vals.map((v) => `${key}: ${v}`));
    }
  }
  if (nearby.length === 0) {
    nearby.push("Schools within 2 km", "Hospitals within 3 km", "Metro connectivity", "Market & daily needs");
  }

  const rawChecklist = Array.isArray(visit.checklist)
    ? visit.checklist
        .map((item) => (typeof item === "string" ? item : typeof item === "object" && item && "text" in item ? String((item as { text: unknown }).text) : null))
        .filter((item): item is string => Boolean(item?.trim()))
    : [];
  const checklist =
    rawChecklist.length > 0
      ? rawChecklist
      : buildPropertyChecklist({
          propertyType: prop?.type,
          hasRera: isReraApproved(prop),
          hasParking: Boolean(prop?.parking),
        });

  const pros: string[] = [];
  const cons: string[] = [];
  if (isReraApproved(prop)) pros.push("RERA registered project");
  else cons.push("Verify RERA registration on site");
  if (prop?.amenities && prop.amenities.length > 3) pros.push(`${prop.amenities.length} amenities listed`);
  if (prop?.parking) pros.push(`Parking: ${prop.parking}`);
  else cons.push("Confirm parking allocation");
  if (visit.builder_name) pros.push(`Builder: ${visit.builder_name}`);

  const priceStr = prop?.price ? formatInrAmount(prop.price) : "market rate";
  const marketPriceNote = `Compare ${priceStr} with 2-3 similar projects in ${prop?.city ?? "the area"} before deciding.`;

  return {
    propertySummary: {
      title: formatPropertyTitle(prop?.title) || "Property",
      builder: visit.builder_name ?? prop?.builder_name ?? null,
      area: prop?.area_sqft ? `${prop.area_sqft} sq ft` : null,
      price: prop?.price ?? null,
      location: [prop?.location, prop?.city].filter(Boolean).join(", ") || null,
    },
    pros,
    cons,
    nearby,
    checklist,
    questionsToAsk: DEFAULT_QUESTIONS,
    documentsToVerify: DEFAULT_DOCUMENTS,
    marketPriceNote,
    aiPreparationTips: [
      "Reach 15 minutes early to observe the neighbourhood",
      "Take photos of sample flat, amenities, and approach road",
      "Note traffic during peak hours if possible",
      "Ask about pending litigation or delays",
      "Verify actual vs promised carpet area",
    ],
  };
}

export function buildDefaultDuringVisitContext(): DuringVisitContext {
  return {
    checklistProgress: {},
    notes: "",
    voiceNoteUrls: [],
    photoUrls: [],
    ratings: {
      parking: 3,
      construction: 3,
      builderBehaviour: 3,
      amenities: 3,
      security: 3,
      powerBackup: 3,
      water: 3,
      connectivity: 3,
      nearbySchools: 3,
      hospitals: 3,
      metro: 3,
      traffic: 3,
      environment: 3,
    },
  };
}

export function buildAfterVisitContext(
  feedback: Record<string, unknown> | null,
): AfterVisitContext {
  const wouldBuy = typeof feedback?.wouldBuy === "boolean" ? feedback.wouldBuy : null;
  const builderRating = typeof feedback?.builderBehaviour === "number" ? feedback.builderBehaviour : null;
  const notes = typeof feedback?.notes === "string" ? feedback.notes : "";

  return {
    feedbackSubmitted: Boolean(feedback?.submittedAt),
    wouldBuy,
    needFollowUp: wouldBuy === null,
    needAnotherVisit: wouldBuy === false && builderRating !== null && builderRating >= 3,
    interested: wouldBuy === true,
    notInterested: wouldBuy === false,
    budgetMismatch: notes.toLowerCase().includes("budget"),
    builderBehaviourRating: builderRating,
    summary: notes.slice(0, 200) || "No feedback submitted yet",
  };
}

export const DURING_VISIT_RATING_LABELS: Array<{ key: keyof DuringVisitContext["ratings"]; label: string }> = [
  { key: "parking", label: "Parking & Access" },
  { key: "construction", label: "Construction Quality" },
  { key: "builderBehaviour", label: "Builder Behaviour" },
  { key: "amenities", label: "Amenities" },
  { key: "security", label: "Security" },
  { key: "powerBackup", label: "Power Backup" },
  { key: "water", label: "Water Supply" },
  { key: "connectivity", label: "Connectivity" },
  { key: "nearbySchools", label: "Nearby Schools" },
  { key: "hospitals", label: "Hospitals" },
  { key: "metro", label: "Metro Access" },
  { key: "traffic", label: "Traffic" },
  { key: "environment", label: "Environment" },
];

export const AFTER_VISIT_OUTCOMES = [
  { key: "interested", label: "Interested", icon: "✅" },
  { key: "notInterested", label: "Not Interested", icon: "❌" },
  { key: "needFollowUp", label: "Need Follow-up", icon: "📞" },
  { key: "needAnotherVisit", label: "Need Another Visit", icon: "🔄" },
  { key: "budgetMismatch", label: "Budget Mismatch", icon: "💰" },
] as const;
