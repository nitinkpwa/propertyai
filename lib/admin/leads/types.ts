import type { BuyerProfileForCRM } from "@/lib/crm/buyerProfile";
import type {
  AdminBuyerJourney,
  CrmLead,
  CrmLeadActivity,
  CrmNotification,
  LeadStatus,
} from "@/lib/crm/types";
import type { AdminProfileEmbed } from "@/lib/admin/types";
import type { LeadScoreResult } from "@/lib/crm/leadScore";
import type { Conversation, Inquiry, SavedProperty } from "@/lib/supabase";

export interface AdminPropertyEmbed {
  id: string;
  title: string;
  city: string | null;
  price: number | null;
  location?: string | null;
  sub_type?: string | null;
  type?: string | null;
}

export interface AdminLeadSummary {
  /** Buyer profile id — used in /admin/leads/[profileId] */
  id: string;
  buyerId: string;
  crmLeadId: string | null;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  phone: string | null;
  email: string | null;
  leadScore: LeadScoreResult;
  stage: string;
  stageKey: string;
  source: string;
  interestedLocation: string;
  budget: string;
  propertyType: string;
  configuration: string;
  preferredPossession: string;
  assignedManager: string | null;
  assignedManagerId: string | null;
  lastActivity: string | null;
  lastActivityAt: string | null;
  createdAt: string;
  signupDate: string | null;
  nextFollowUp: string | null;
  unreadMessages: number;
  primaryPropertyTitle: string | null;
  leadSource: string;
}

export interface AdminAiInsights {
  buyingIntent: string | null;
  budgetConfidence: string | null;
  recommendedProjects: string[];
  matchingBuilders: string[];
  probabilityToBuy: number | null;
  bestTimeToFollowUp: string | null;
  recommendedNextAction: string | null;
}

export interface AdminBuyerJourneyEvent {
  id: string;
  title: string;
  description: string | null;
  at: string;
  icon: string;
}

export interface AdminLeadProfile extends AdminLeadSummary {
  buyer: BuyerProfileForCRM | null;
  seller: AdminProfileEmbed | null;
  connect: AdminProfileEmbed | null;
  crmLead: CrmLead | null;
  inquiry: Inquiry | null;
  crmStatus: LeadStatus | null;
  crmStatusLabel: string | null;
  inquiryStatus: string | null;
  message: string | null;
  leadScore: LeadScoreResult;
  profileCompletion: number;
  counts: {
    enquiries: number;
    savedProperties: number;
    siteVisits: number;
    conversations: number;
    activities: number;
    propertyViews: number;
    unreadNotifications: number;
  };
  activities: CrmLeadActivity[];
  enquiries: Inquiry[];
  savedProperties: SavedProperty[];
  siteVisits: AdminBuyerJourney["siteVisits"];
  propertyViews: Array<{
    id: string;
    property_id: string;
    viewed_at: string;
    property?: { title?: string; city?: string; price?: number } | null;
  }>;
  conversations: Array<{
    id: string;
    title: string;
    messages: Conversation["messages"];
    preview: string;
    messageCount: number;
    updated_at: string;
    created_at: string;
  }>;
  notifications: CrmNotification[];
  aiSummary: string | null;
  aiSummaryConfidence: number | null;
  aiInsights: AdminAiInsights | null;
  tags: string[];
  lastSeenAt: string | null;
  whatsApp: string | null;
  buyerNotes: string | null;
  signupDate: string | null;
  buyerJourney: AdminBuyerJourneyEvent[];
  sharedProperties: AdminPropertyEmbed[];
  timeline: Array<{
    id: string;
    title: string;
    description: string | null;
    at: string;
    actor: string;
    icon: string;
  }>;
  followUps: Array<{
    id: string;
    title: string;
    dueAt: string | null;
    status: "upcoming" | "completed";
    source: string;
  }>;
}
