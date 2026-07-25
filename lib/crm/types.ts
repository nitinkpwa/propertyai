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
  | "property_compared"
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
  | "visit_notes_saved"
  | "negotiation_started"
  | "deal_booked"
  | "deal_closed"
  | "deal_lost"
  | "lead_assigned"
  | "lead_reassigned"
  | "status_changed"
  | "partner_call"
  | "partner_whatsapp"
  | "partner_email"
  | "follow_up_scheduled"
  | "follow_up_completed"
  | "document_uploaded"
  | "reminder_sent";

export type NotificationType =
  | "new_inquiry"
  | "property_saved"
  | "property_compared"
  | "site_visit_booked"
  | "site_visit_accepted"
  | "site_visit_rejected"
  | "site_visit_completed"
  | "visit_feedback_submitted"
  | "lead_assigned"
  | "lead_reassigned"
  | "new_lead"
  | "general"
  | "status_changed"
  | "follow_up_due"
  | "negotiation_started"
  | "booking_completed"
  | "property_updated"
  | "reminder";

export type FollowUpPriority = "low" | "normal" | "high" | "urgent";
export type FollowUpStatus = "pending" | "completed" | "overdue" | "cancelled";

export type VisitStatus =
  | "pending_approval"
  | "accepted"
  | "scheduled"
  | "rescheduled"
  | "completed"
  | "rejected"
  | "cancelled";

export type PropertyOwnerType = "seller" | "builder";

export interface CrmLead {
  id: string;
  buyer_id: string;
  status: LeadStatus;
  assigned_connect_id: string | null;
  connect_partner_id: string | null;
  primary_property_id: string | null;
  first_login_at: string | null;
  lead_score?: number;
  lead_temperature?: "cold" | "warm" | "hot";
  engagement_score?: number;
  visit_score?: number;
  interest_score?: number;
  budget_match_score?: number;
  conversion_probability?: number;
  follow_up_date?: string | null;
  follow_up_priority?: FollowUpPriority;
  next_action?: string | null;
  last_call_at?: string | null;
  last_whatsapp_at?: string | null;
  last_email_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  buyer?: BuyerProfileForCRM | null;
}

export interface CrmFollowUp {
  id: string;
  lead_id: string;
  partner_id: string | null;
  assigned_to: string | null;
  due_at: string;
  priority: FollowUpPriority;
  action: string;
  notes: string | null;
  status: FollowUpStatus;
  completed_at: string | null;
  created_at: string;
}

export interface LeadDetailView {
  lead: CrmLead;
  activities: CrmLeadActivity[];
  followUps: CrmFollowUp[];
  intelligence: {
    lead_score: number;
    lead_temperature: "cold" | "warm" | "hot";
    engagement_score: number;
    visit_score: number;
    interest_score: number;
    budget_match_score: number;
    conversion_probability: number;
    next_action: string | null;
  };
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
  /** Most recently updated lead — used for primary journey stage. */
  lead: CrmLead | null;
  /** All partner-scoped + general leads for multi-journey UI. */
  leads: CrmLead[];
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
  status: VisitStatus | string;
  purpose?: string | null;
  builder_name?: string | null;
  created_at?: string | null;
  accepted_at?: string | null;
  accepted_by?: string | null;
  rejected_at?: string | null;
  rejected_by?: string | null;
  completed_at?: string | null;
  rescheduled_from?: string | null;
  rescheduled_to?: string | null;
  property?: {
    id?: string;
    title?: string;
    location?: string;
    city?: string;
    builder_name?: string | null;
  } | null;
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
