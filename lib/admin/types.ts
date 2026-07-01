import type { BuyerProfileForCRM } from "@/lib/crm/buyerProfile";
import type { Profile, Property, Conversation, Inquiry } from "@/lib/supabase";

export type AdminTab =
  | "dashboard"
  | "properties"
  | "pending"
  | "users"
  | "builders"
  | "leads"
  | "crm"
  | "visits"
  | "chats"
  | "analytics"
  | "settings"
  | "add"
  | "bulk";

export interface AdminOverviewStats {
  totalProperties: number;
  pendingProperties: number;
  approvedProperties: number;
  buyers: number;
  sellers: number;
  builders: number;
  siteVisits: number;
  aiChats: number;
  leads: number;
}

export interface AdminAnalytics {
  propertiesByStatus: Array<{ status: string; count: number }>;
  leadsByStatus: Array<{ status: string; count: number }>;
  usersByRole: Array<{ role: string; count: number }>;
  propertiesByCity: Array<{ city: string; count: number }>;
  hasSiteVisitsTable: boolean;
  hasPropertyViewsTable: boolean;
  usesApprovalStatus: boolean;
}

export interface AdminPropertyRow extends Property {
  approval_status?: string | null;
  seller?: { full_name?: string | null; phone?: string | null; email?: string | null } | null;
}

export interface AdminLeadRow extends Inquiry {
  seller_id?: string;
  property?: { title?: string; city?: string } | null;
  buyer?: BuyerProfileForCRM | null;
  seller?: { full_name?: string | null } | null;
  leadSource?: "Inquiry" | "Site Visit" | "CRM";
  crmStatus?: string | null;
  assignedConnect?: string | null;
  crmLeadId?: string | null;
}

export interface AdminConversationRow extends Conversation {
  user?: { full_name?: string | null; email?: string | null; phone?: string | null } | null;
}

export interface AdminSiteVisitRow {
  id: string;
  user_id: string;
  property_id: string;
  visit_date: string;
  visit_time: string;
  status: string;
  purpose?: string | null;
  lead_id?: string | null;
  inquiry_id?: string | null;
  created_at: string;
  property?: { title?: string; city?: string } | null;
  buyer?: BuyerProfileForCRM | null;
}

export interface BuilderRow extends Profile {
  company?: string | null;
  listing_count: number;
  project_count: number;
}

export interface AdminData {
  properties: AdminPropertyRow[];
  profiles: Profile[];
  leads: AdminLeadRow[];
  conversations: AdminConversationRow[];
  siteVisits: AdminSiteVisitRow[];
  stats: AdminOverviewStats;
  analytics: AdminAnalytics;
  usesApprovalStatus: boolean;
  hasSiteVisitsTable: boolean;
  hasConversationsTable: boolean;
}
