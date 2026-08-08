import type {
  ConnectPartner,
  ConnectPartnerActivity,
  ConnectPartnerActivityType,
  ConnectPartnerStatus,
} from "@/lib/supabase";

export type {
  ConnectPartner,
  ConnectPartnerActivity,
  ConnectPartnerActivityType,
  ConnectPartnerStatus,
};

export interface ConnectPartnerListRow extends ConnectPartner {
  project_count: number;
  listing_count: number;
  assigned_buyers: number;
  last_activity_at: string | null;
}

export type ConnectPartnerActivityRow = ConnectPartnerActivity;

export interface ConnectPartnerAnalytics {
  totalBuyers: number;
  todaysBuyers: number;
  hot: number;
  warm: number;
  cold: number;
  visitsScheduled: number;
  negotiation: number;
  closed: number;
  lost: number;
  properties: number;
  listings: number;
  responseTimeHours: number | null;
  monthlyActivity: Array<{ month: string; count: number }>;
}

export interface ConnectPartnerBuyerRow {
  id: string;
  lead_id: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  budget_min: number | null;
  budget_max: number | null;
  preferred_locations: string[] | null;
  preferred_property_types: string[] | null;
  buying_purpose: string | null;
  buying_timeline: string | null;
  buyer_notes: string | null;
  created_at: string;
  lead_status: string | null;
  lead_score: number;
  lead_temperature: "hot" | "warm" | "cold";
  last_chat_at: string | null;
  visit_status: string | null;
  property_id: string | null;
  property_title: string | null;
  property_city: string | null;
  lead_source: string | null;
  last_activity_at: string | null;
  follow_up_date?: string | null;
  next_action?: string | null;
  last_call_at?: string | null;
  last_whatsapp_at?: string | null;
  last_email_at?: string | null;
}

/**
 * Assigned Connect Partner listing row.
 * Field names match live `properties` columns selected in fetchPartnerProperties
 * (`area_sqft` is the real DB column — not built_up_area / carpet_area).
 */
export interface ConnectPartnerPropertyRow {
  id: string;
  title: string;
  city: string;
  location: string | null;
  price: number;
  calculated_price: number | null;
  area_sqft: number | null;
  status: string;
  type: string | null;
  sub_type: string | null;
  photos: string[] | null;
  featured_image?: string | null;
  nearby_places: unknown | null;
  created_at: string;
  updated_at: string;
  enquiry_count: number;
  visit_count: number;
  hot_leads: number;
  view_count: number;
}

export type AdminConnectTab =
  | "partners"
  | "analytics"
  | "activities"
  | "buyers"
  | "properties";

export type ConnectDashboardTab =
  | "overview"
  | "projects"
  | "properties"
  | "buyers"
  | "analytics"
  | "activities"
  | "documents"
  | "settings";

export interface CreateConnectPartnerInput {
  companyName: string;
  managerName: string;
  phone: string;
  email: string;
  password: string;
  address?: string;
  city?: string;
  gst?: string;
  rera?: string;
  logo?: string;
  notes?: string;
  status?: ConnectPartnerStatus;
}

export interface UpdateConnectPartnerInput {
  companyName?: string;
  managerName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  gst?: string;
  rera?: string;
  logo?: string;
  notes?: string;
  status?: ConnectPartnerStatus;
}
