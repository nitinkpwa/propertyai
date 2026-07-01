import type { BuyerProfileForCRM } from "@/lib/crm/buyerProfile";

export type LeadStatus =
  | "new"
  | "ai_qualified"
  | "interested"
  | "property_suggested"
  | "property_saved"
  | "inquiry_sent"
  | "visit_scheduled"
  | "visited"
  | "negotiation"
  | "booked"
  | "completed"
  | "lost";

export type ActivityType =
  | "buyer_registered"
  | "buyer_first_login"
  | "ai_chat_started"
  | "ai_chat_message"
  | "property_viewed"
  | "property_saved"
  | "property_unsaved"
  | "contact_requested"
  | "inquiry_sent"
  | "visit_requested"
  | "site_visit_booked"
  | "site_visit_accepted"
  | "site_visit_rejected"
  | "site_visit_rescheduled"
  | "site_visit_completed"
  | "site_visit_cancelled"
  | "visit_checklist_generated"
  | "visit_feedback_submitted"
  | "negotiation_started"
  | "deal_booked"
  | "deal_closed"
  | "deal_lost"
  | "lead_assigned"
  | "lead_reassigned"
  | "status_changed";

export type NotificationType =
  | "new_inquiry"
  | "property_saved"
  | "site_visit_booked"
  | "site_visit_accepted"
  | "site_visit_rejected"
  | "lead_assigned"
  | "lead_reassigned"
  | "new_lead"
  | "general";

export type VisitStatus =
  | "pending_approval"
  | "accepted"
  | "scheduled"
  | "completed"
  | "rejected"
  | "cancelled";

export type PropertyOwnerType = "seller" | "builder";

export interface CrmLead {
  id: string;
  buyer_id: string;
  status: LeadStatus;
  assigned_connect_id: string | null;
  primary_property_id: string | null;
  first_login_at: string | null;
  created_at: string;
  updated_at: string;
  buyer?: BuyerProfileForCRM | null;
}

export interface CrmLeadActivity {
  id: string;
  lead_id: string;
  activity_type: ActivityType;
  title: string;
  description: string | null;
  property_id: string | null;
  inquiry_id: string | null;
  conversation_id: string | null;
  site_visit_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  property?: { title?: string; city?: string; location?: string } | null;
}

export interface CrmNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  lead_id: string | null;
  property_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface PropertyOwnerInfo {
  ownerId: string;
  ownerType: PropertyOwnerType;
  ownerName: string;
}

export interface BuyerCrmSummary {
  lead: CrmLead | null;
  enquiriesCount: number;
  savedCount: number;
  chatsCount: number;
  visitsCount: number;
  activities: CrmLeadActivity[];
}

export interface SellerCrmLeadRow extends CrmLead {
  buyer?: BuyerProfileForCRM | null;
  recentActivity?: CrmLeadActivity | null;
  propertyTitle?: string | null;
  propertyId?: string | null;
  leadSource?: "Site Visit" | "Inquiry" | "Registration";
  siteVisitId?: string | null;
}

export interface SiteVisitDetail {
  id: string;
  user_id: string;
  property_id: string;
  lead_id?: string | null;
  inquiry_id?: string | null;
  visit_date: string;
  visit_time: string;
  status: VisitStatus;
  purpose: string | null;
  visit_location: string | null;
  builder_name: string | null;
  checklist: string[];
  feedback: Record<string, unknown> | null;
  accepted_at: string | null;
  created_at: string;
  property?: {
    title?: string;
    location?: string;
    city?: string;
    contact_phone?: string | null;
    contact_name?: string | null;
    seller_id?: string;
  } | null;
  buyer?: BuyerProfileForCRM | null;
  ownerContact?: {
    phone: string | null;
    email: string | null;
    whatsapp: string | null;
    name: string | null;
  } | null;
}

export interface ConnectSiteVisitRow {
  id: string;
  user_id: string;
  property_id: string;
  visit_date: string;
  visit_time: string;
  status: string;
  purpose?: string | null;
  property?: { title?: string; location?: string; city?: string } | null;
  buyer: BuyerProfileForCRM | null;
}

export interface AdminBuyerJourney {
  profile: BuyerProfileForCRM | null;
  lead: CrmLead | null;
  activities: CrmLeadActivity[];
  enquiries: Array<Record<string, unknown>>;
  savedProperties: Array<Record<string, unknown>>;
  siteVisits: SiteVisitDetail[];
  conversations: Array<{ id: string; title: string; preview: string; messageCount: number }>;
  aiSummary: string | null;
}
