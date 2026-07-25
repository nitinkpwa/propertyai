export { createClient, supabase } from "@/lib/supabase/client";

export type ConnectPartnerStatus = "pending" | "active" | "suspended" | "archived";

export type ConnectPartnerActivityType =
  | "partner_created"
  | "buyer_assigned"
  | "buyer_removed"
  | "property_assigned"
  | "property_updated"
  | "property_approved"
  | "property_rejected"
  | "site_visit"
  | "login"
  | "logout"
  | "notes_added"
  | "lead_updated";

export type ConnectPartner = {
  id: string;
  profile_id: string | null;
  company_name: string;
  manager_name: string;
  email: string;
  phone: string;
  address: string | null;
  city: string | null;
  gst: string | null;
  rera: string | null;
  logo: string | null;
  status: ConnectPartnerStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ConnectPartnerActivity = {
  id: string;
  type: ConnectPartnerActivityType;
  actor_id: string | null;
  partner_id: string | null;
  buyer_id: string | null;
  property_id: string | null;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: {
    id: string;
    full_name: string | null;
    role: string | null;
  } | null;
  buyer?: {
    id: string;
    full_name: string | null;
    phone: string | null;
  } | null;
  property?: {
    id: string;
    title: string | null;
    city: string | null;
  } | null;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  /** Auth metadata only — not stored on production profiles table */
  username?: string | null;
  phone: string;
  role: "buyer" | "seller" | "builder" | "admin";
  avatar_url?: string;
  city?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  preferred_locations?: string[] | null;
  preferred_property_types?: string[] | null;
  buying_purpose?: string | null;
  buying_timeline?: string | null;
  loan_status?: string | null;
  occupation?: string | null;
  family_size?: number | null;
  buyer_notes?: string | null;
  contact_email?: string | null;
  connect_partner_id?: string | null;
  created_at: string;
};

export type Property = {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  type: "buy" | "rent" | "commercial";
  sub_type:
    | "flat"
    | "plot"
    | "house"
    | "sco"
    | "office"
    | "warehouse"
    | "coworking"
    | "builder_floor";
  price: number;
  /** Auto-calculated total for search/sort when rate×area is used */
  calculated_price?: number | null;
  area_sqft: number;
  bedrooms?: number;
  bathrooms?: number;
  location: string;
  city: string;
  sector?: string;
  lat?: number;
  lng?: number;
  photos: string[];
  amenities: string[];
  /** Live DB: active | sold | rented | paused (no draft). */
  status: "active" | "sold" | "rented" | "paused";
  is_featured: boolean;
  contact_name: string;
  contact_phone: string;
  created_at: string;
  connect_partner_id?: string | null;
  assigned_connect_id?: string | null;
  /** Default true — buyers can request visits when status is active. */
  site_visit_enabled?: boolean;
  /** Admin-only legal verification (internal moderation — not buyer-facing). */
  approved_building_plan?: boolean;
  rera_certificate?: boolean;
  title_deed_verified?: boolean;
  noc_verified?: boolean;
  completion_certificate?: boolean;
  occupation_certificate?: boolean;
  environment_clearance?: boolean;
  fire_clearance?: boolean;
  bank_approved?: boolean;
  govt_layout_approved?: boolean;
  legal_verification_updated_at?: string | null;
  legal_verification_updated_by?: string | null;
};

export type SavedProperty = {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
  property?: Property;
};

export type Conversation = {
  id: string;
  user_id: string;
  title: string;
  messages: {
    role: string;
    content: string;
    timestamp?: string;
    suggested_property_ids?: string[];
  }[];
  property_context?: Record<string, unknown> | null;
  suggested_property_ids?: string[];
  created_at: string;
  updated_at: string;
};

export type Inquiry = {
  id: string;
  from_user_id: string;
  property_id: string;
  message: string;
  status: "new" | "read" | "replied";
  created_at: string;
};

export function getSiteUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
