import type { BuyerProfileForCRM } from "@/lib/crm/buyerProfile";
import { labelForPropertyTypes, labelForPurpose, labelForTimeline } from "@/lib/buyer/profileFields";
import { LEAD_STATUS_LABELS } from "@/lib/crm/constants";
import type { ActivityType, CrmLeadActivity, LeadStatus } from "@/lib/crm/types";
import { ACTIVITY_ICONS } from "@/lib/crm/constants";
import { resolveDisplayName } from "@/lib/admin/profileDisplay";
import { formatPrice } from "@/lib/admin/constants";
import type { LeadScoreResult } from "@/lib/crm/leadScore";
import type {
  AdminAiInsights,
  AdminBuyerJourneyEvent,
  AdminLeadProfile,
  AdminPropertyEmbed,
} from "./types";

/** User-facing status labels for admin leads list. */
const STAGE_DISPLAY: Record<LeadStatus, string> = {
  new: "New",
  ai_qualified: "Qualified",
  interested: "Qualified",
  property_suggested: "Property Shared",
  property_saved: "Property Shared",
  inquiry_sent: "Property Shared",
  visit_scheduled: "Visit Scheduled",
  visited: "Visit Scheduled",
  negotiation: "Negotiation",
  booked: "Booked",
  completed: "Closed",
  lost: "Lost",
};

export function mapCrmStage(status?: LeadStatus | null): { stage: string; stageKey: string } {
  if (!status) return { stage: "New", stageKey: "new" };
  return { stage: STAGE_DISPLAY[status] ?? LEAD_STATUS_LABELS[status], stageKey: status };
}

export function mapInquiryStage(status?: string | null): { stage: string; stageKey: string } {
  switch (status) {
    case "replied":
      return { stage: "Property Shared", stageKey: "inquiry_replied" };
    case "read":
      return { stage: "Qualified", stageKey: "inquiry_read" };
    default:
      return { stage: "New", stageKey: "inquiry_new" };
  }
}

export function mapLeadSource(input: {
  leadSource?: string | null;
  activities?: CrmLeadActivity[];
  hasAiChat?: boolean;
}): string {
  const types = new Set((input.activities ?? []).map((a) => a.activity_type));
  if (types.has("inquiry_sent")) return "Website";
  if (input.leadSource === "Inquiry") return "Website";
  if (input.leadSource === "Site Visit") return "WhatsApp";
  if (input.hasAiChat || types.has("ai_chat_started") || types.has("ai_chat_message")) {
    return "Website";
  }
  if (input.leadSource === "CRM") return "Organic";
  return "Referral";
}

export function mapConfiguration(buyer?: BuyerProfileForCRM | null): string {
  if (!buyer?.family_size) {
    const types = buyer?.preferred_property_types ?? [];
    if (types.includes("flat") || types.includes("builder_floor")) return "2BHK";
    if (types.includes("house")) return "3BHK";
    return "—";
  }
  if (buyer.family_size <= 2) return "1BHK";
  if (buyer.family_size <= 3) return "2BHK";
  if (buyer.family_size <= 4) return "3BHK";
  return "4BHK";
}

export function mapPreferredPossession(buyer?: BuyerProfileForCRM | null): string {
  const timeline = buyer?.buying_timeline ?? buyer?.purchase_timeline;
  switch (timeline) {
    case "immediate":
    case "15_days":
      return "Ready";
    case "1_month":
    case "3_months":
      return "Under Construction";
    case "6_months":
    case "exploring":
      return "Flexible";
    default:
      return "—";
  }
}

export function mapUrgency(buyer?: BuyerProfileForCRM | null): string {
  return labelForTimeline(buyer?.buying_timeline ?? buyer?.purchase_timeline) || "—";
}

export function mapPurposeGroup(buyer?: BuyerProfileForCRM | null): string {
  const purpose = buyer?.buying_purpose;
  if (purpose === "investment" || purpose === "rental_income") return "Invest";
  if (purpose === "family" || purpose === "self") return "Buy";
  return labelForPurpose(purpose) || "Buy";
}

export function mapPropertyTypes(buyer?: BuyerProfileForCRM | null): string {
  return labelForPropertyTypes(buyer?.preferred_property_types) || "—";
}

export function mapInterestedLocation(buyer?: BuyerProfileForCRM | null): string {
  if (buyer?.locationsLabel) return buyer.locationsLabel;
  if (buyer?.city) return buyer.city;
  return "—";
}

export function buildTags(buyer?: BuyerProfileForCRM | null, score?: { temperature: string }): string[] {
  const tags: string[] = [];
  if (score?.temperature === "hot") tags.push("Hot Lead");
  if (buyer?.loan_status === "approved") tags.push("Loan Approved");
  if (buyer?.buying_timeline === "immediate") tags.push("Urgent");
  if ((buyer?.preferred_locations?.length ?? 0) > 0) tags.push("Location Set");
  return tags;
}

export function activityTitle(type: ActivityType): string {
  const titles: Partial<Record<ActivityType, string>> = {
    buyer_registered: "Created account",
    buyer_first_login: "First login",
    ai_chat_started: "Asked AI",
    ai_chat_message: "AI conversation",
    property_viewed: "Viewed property",
    property_saved: "Saved property",
    contact_requested: "Clicked contact",
    inquiry_sent: "Sent inquiry",
    visit_requested: "Requested visit",
    site_visit_booked: "Scheduled visit",
    site_visit_completed: "Visit completed",
    visit_feedback_submitted: "Visit feedback",
    lead_assigned: "Manager assigned",
    lead_reassigned: "Manager reassigned",
    negotiation_started: "Negotiation started",
    deal_booked: "Deal booked",
    deal_closed: "Deal closed",
    deal_lost: "Lead lost",
    status_changed: "Stage changed",
  };
  return titles[type] ?? type.replace(/_/g, " ");
}

export function buildTimelineEvents(
  activities: CrmLeadActivity[],
  options?: {
    buyerName?: string;
    connectName?: string;
  },
): AdminLeadProfile["timeline"] {
  return activities.map((activity) => ({
    id: activity.id,
    title: activity.title || activityTitle(activity.activity_type),
    description: activity.description,
    at: activity.created_at,
    actor:
      activity.activity_type === "lead_assigned" || activity.activity_type === "lead_reassigned"
        ? options?.connectName ?? "System"
        : options?.buyerName ?? "Buyer",
    icon: ACTIVITY_ICONS[activity.activity_type] ?? "•",
  }));
}

export function deriveFollowUps(input: {
  activities: CrmLeadActivity[];
  siteVisits: Array<{ id: string; visit_date: string; visit_time?: string; status: string; property?: { title?: string } | null }>;
}): AdminLeadProfile["followUps"] {
  const items: AdminLeadProfile["followUps"] = [];

  for (const visit of input.siteVisits) {
    const upcoming = !["completed", "cancelled", "rejected"].includes(visit.status);
    items.push({
      id: `visit-${visit.id}`,
      title: `Site visit — ${visit.property?.title ?? "Property"}`,
      dueAt: visit.visit_date,
      status: upcoming ? "upcoming" : "completed",
      source: "Site visit",
    });
  }

  for (const activity of input.activities) {
    if (["visit_requested", "site_visit_booked", "negotiation_started"].includes(activity.activity_type)) {
      items.push({
        id: `activity-${activity.id}`,
        title: activity.title || activityTitle(activity.activity_type),
        dueAt: activity.created_at,
        status: activity.activity_type === "negotiation_started" ? "upcoming" : "completed",
        source: "CRM activity",
      });
    }
  }

  return items.sort((a, b) => {
    const aTime = a.dueAt ? new Date(a.dueAt).getTime() : 0;
    const bTime = b.dueAt ? new Date(b.dueAt).getTime() : 0;
    return bTime - aTime;
  });
}

export function resolveManagerName(
  connect?: { full_name?: string | null } | null,
  lookupName?: string | null,
): string | null {
  if (connect) return resolveDisplayName(connect);
  return lookupName ?? null;
}

function toPropertyEmbed(
  propertyId: string,
  property?: {
    title?: string;
    city?: string | null;
    price?: number | null;
    location?: string | null;
    sub_type?: string | null;
    type?: string | null;
  } | null,
): AdminPropertyEmbed | null {
  if (!property?.title) return null;
  return {
    id: propertyId,
    title: property.title,
    city: property.city ?? null,
    price: property.price ?? null,
    location: property.location ?? null,
    sub_type: property.sub_type ?? null,
    type: property.type ?? null,
  };
}

export function buildAiConversationSummary(input: {
  buyer: BuyerProfileForCRM | null;
  conversations: AdminLeadProfile["conversations"];
  profileCompletion: number;
}): { summary: string | null; confidence: number | null } {
  const lines: string[] = [];

  if (input.buyer?.propertyTypesLabel) {
    const config = mapConfiguration(input.buyer);
    const location = input.buyer.locationsLabel || input.buyer.city;
    if (location && config !== "—") {
      lines.push(`Buyer is looking for a ${config} ${input.buyer.propertyTypesLabel.toLowerCase()} in ${location}.`);
    } else if (location) {
      lines.push(`Buyer is looking in ${location}.`);
    }
  }

  if (input.buyer?.budgetLabel) {
    lines.push(`Budget around ${input.buyer.budgetLabel}.`);
  }

  if (input.buyer?.timelineLabel) {
    lines.push(`Needs possession ${input.buyer.timelineLabel.toLowerCase()}.`);
  }

  if (input.buyer?.loanLabel) {
    lines.push(`${input.buyer.loanLabel}.`);
  }

  if (input.buyer?.familySizeLabel) {
    lines.push(`Family of ${input.buyer.familySizeLabel}.`);
  }

  if (input.buyer?.occupationLabel) {
    lines.push(`Occupation: ${input.buyer.occupationLabel}.`);
  }

  const chatSnippets = input.conversations
    .flatMap((c) => c.messages.filter((m) => m.role === "user").map((m) => m.content.trim()))
    .filter((text) => text.length > 20)
    .slice(0, 3);

  for (const snippet of chatSnippets) {
    if (!lines.some((line) => line.includes(snippet.slice(0, 40)))) {
      lines.push(snippet.endsWith(".") ? snippet : `${snippet}.`);
    }
  }

  if (lines.length === 0) {
    return { summary: null, confidence: null };
  }

  return {
    summary: lines.join("\n\n"),
    confidence: input.profileCompletion > 0 ? input.profileCompletion : null,
  };
}

export function buildAiInsights(input: {
  buyer: BuyerProfileForCRM | null;
  leadScore: LeadScoreResult;
  savedProperties: AdminPropertyEmbed[];
  enquiries: Array<{ property?: { title?: string } | null; seller?: { full_name?: string | null } | null }>;
  siteVisits: Array<{ status: string; visit_date: string }>;
  crmStatus: LeadStatus | null;
  upcomingVisitDate: string | null;
}): AdminAiInsights | null {
  const insights: AdminAiInsights = {
    buyingIntent: null,
    budgetConfidence: null,
    recommendedProjects: [],
    matchingBuilders: [],
    probabilityToBuy: input.leadScore.score,
    bestTimeToFollowUp: null,
    recommendedNextAction: null,
  };

  let hasData = false;

  if (input.leadScore.temperature) {
    insights.buyingIntent = `${input.leadScore.temperature.toUpperCase()} — ${input.leadScore.factors.join(", ") || "Limited engagement so far"}`;
    hasData = true;
  }

  if (input.buyer?.budget_min != null || input.buyer?.budget_max != null) {
    const parts: string[] = [];
    if (input.buyer.budget_min != null) parts.push(`Min ${formatPrice(input.buyer.budget_min)}`);
    if (input.buyer.budget_max != null) parts.push(`Max ${formatPrice(input.buyer.budget_max)}`);
    insights.budgetConfidence = parts.join(" · ");
    hasData = true;
  }

  insights.recommendedProjects = input.savedProperties.map((p) => p.title).filter(Boolean).slice(0, 5);
  if (insights.recommendedProjects.length > 0) hasData = true;

  const builders = new Set<string>();
  for (const enquiry of input.enquiries) {
    const name = enquiry.seller?.full_name;
    if (name?.trim()) builders.add(name.trim());
  }
  insights.matchingBuilders = [...builders].slice(0, 5);
  if (insights.matchingBuilders.length > 0) hasData = true;

  if (input.buyer?.timelineLabel) {
    insights.bestTimeToFollowUp = input.buyer.timelineLabel;
    hasData = true;
  } else if (input.upcomingVisitDate) {
    insights.bestTimeToFollowUp = `Before visit on ${input.upcomingVisitDate}`;
    hasData = true;
  }

  if (input.crmStatus === "visit_scheduled" || input.crmStatus === "visited") {
    insights.recommendedNextAction = "Confirm site visit details and gather feedback";
    hasData = true;
  } else if (input.crmStatus === "inquiry_sent" || input.crmStatus === "property_saved") {
    insights.recommendedNextAction = "Share matching properties and schedule a visit";
    hasData = true;
  } else if ((input.siteVisits.length ?? 0) === 0 && input.savedProperties.length > 0) {
    insights.recommendedNextAction = "Offer a site visit for saved properties";
    hasData = true;
  } else if (input.leadScore.temperature === "hot") {
    insights.recommendedNextAction = "Call buyer to discuss shortlisted options";
    hasData = true;
  }

  return hasData ? insights : null;
}

export function buildBuyerJourney(input: {
  signupDate: string | null;
  conversations: AdminLeadProfile["conversations"];
  propertyViews: AdminLeadProfile["propertyViews"];
  savedProperties: Array<{ id: string; created_at: string; property?: { title?: string } | null }>;
  enquiries: Array<{ id: string; created_at: string; property?: { title?: string } | null }>;
  siteVisits: Array<{ id: string; visit_date: string; status: string; property?: { title?: string } | null }>;
  activities: CrmLeadActivity[];
}): AdminBuyerJourneyEvent[] {
  const events: AdminBuyerJourneyEvent[] = [];

  if (input.signupDate) {
    events.push({
      id: "signup",
      title: "Account Created",
      description: null,
      at: input.signupDate,
      icon: "👤",
    });
  }

  const firstChat = [...input.conversations].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )[0];
  if (firstChat) {
    events.push({
      id: `chat-${firstChat.id}`,
      title: "Intelligence Session Started",
      description: firstChat.title,
      at: firstChat.created_at,
      icon: "🤖",
    });
  }

  for (const view of input.propertyViews) {
    events.push({
      id: `view-${view.id}`,
      title: "Property Viewed",
      description: (view.property as { title?: string })?.title ?? null,
      at: view.viewed_at,
      icon: "👁️",
    });
  }

  for (const saved of input.savedProperties) {
    events.push({
      id: `saved-${saved.id}`,
      title: "Property Saved",
      description: saved.property?.title ?? null,
      at: saved.created_at,
      icon: "❤️",
    });
  }

  for (const enquiry of input.enquiries) {
    events.push({
      id: `enquiry-${enquiry.id}`,
      title: "Builder Contacted",
      description: enquiry.property?.title ?? null,
      at: enquiry.created_at,
      icon: "📩",
    });
  }

  for (const visit of input.siteVisits) {
    const status = visit.status.replace(/_/g, " ");
    const isRequested = ["requested", "pending", "pending_approval"].includes(visit.status);
    events.push({
      id: `visit-${visit.id}`,
      title: isRequested ? "Site Visit Requested" : "Visit Scheduled",
      description: `${visit.property?.title ?? "Property"} · ${status}`,
      at: visit.visit_date,
      icon: isRequested ? "📋" : "📅",
    });
  }

  for (const activity of input.activities) {
    if (activity.activity_type === "deal_booked" || activity.activity_type === "negotiation_started") {
      events.push({
        id: `activity-${activity.id}`,
        title: activity.activity_type === "deal_booked" ? "Offer Shared" : activityTitle(activity.activity_type),
        description: activity.description,
        at: activity.created_at,
        icon: ACTIVITY_ICONS[activity.activity_type] ?? "•",
      });
    }
  }

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function mapPropertyEmbedsFromSaved(
  rows: Array<{ property_id: string; property?: Record<string, unknown> | null }>,
): AdminPropertyEmbed[] {
  return rows
    .map((row) =>
      toPropertyEmbed(row.property_id, row.property as AdminPropertyEmbed | null),
    )
    .filter((item): item is AdminPropertyEmbed => item !== null);
}

export function mapPropertyEmbedsFromViews(
  rows: AdminLeadProfile["propertyViews"],
): AdminPropertyEmbed[] {
  return rows
    .map((row) => toPropertyEmbed(row.property_id, row.property ?? null))
    .filter((item): item is AdminPropertyEmbed => item !== null);
}

export function mapPropertyEmbedsFromEnquiries(
  rows: Array<{ property_id: string; property?: Record<string, unknown> | null }>,
): AdminPropertyEmbed[] {
  return rows
    .map((row) =>
      toPropertyEmbed(row.property_id, row.property as AdminPropertyEmbed | null),
    )
    .filter((item): item is AdminPropertyEmbed => item !== null);
}
