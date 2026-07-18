import type { BuyerProfileForCRM } from "@/lib/crm/buyerProfile";
import type { PropertyStatus } from "@/lib/properties/status";
import type { Property, Profile } from "@/lib/supabase";

export type SellerTab =
  | "home"
  | "listings"
  | "add"
  | "leads"
  | "visits"
  | "analytics"
  | "notifications"
  | "profile";

export type PropertyListingStatus = PropertyStatus;

export type LeadStatus =
  | "new"
  | "read"
  | "replied"
  | "contacted"
  | "interested"
  | "closed";

export type VisitStatus =
  | "pending_approval"
  | "accepted"
  | "scheduled"
  | "rescheduled"
  | "completed"
  | "rejected"
  | "cancelled";

export interface SellerProfile extends Profile {}

export interface SellerDashboardStats {
  totalProperties: number;
  activeListings: number;
  draftListings: number;
  soldListings: number;
  totalViews: number;
  savedByBuyers: number;
  leadsReceived: number;
  siteVisits: number;
}

export interface SellerPropertyRow extends Property {
  builder_name?: string | null;
  furnishing?: string | null;
  parking?: string | null;
  facing?: string | null;
  nearby_places?: unknown[] | null;
  rera_number?: string | null;
  possession?: string | null;
  featured_image?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
  site_visit_enabled?: boolean;
  view_count: number;
  save_count: number;
  lead_count: number;
}

export interface SellerLeadRow {
  id: string;
  from_user_id: string;
  property_id: string;
  seller_id: string;
  message: string;
  status: LeadStatus;
  created_at: string;
  property?: { title: string; location?: string; city?: string } | null;
  buyer?: { full_name?: string | null; email?: string | null; phone?: string | null } | null;
}

export interface SellerVisitRow {
  id: string;
  user_id: string;
  property_id: string;
  visit_date: string;
  visit_time: string;
  status: VisitStatus;
  purpose?: string | null;
  visit_location?: string | null;
  builder_name?: string | null;
  checklist?: string[] | null;
  created_at: string;
  property?: { title: string; location?: string; city?: string } | null;
  buyer?: BuyerProfileForCRM | null;
  lead_id?: string | null;
  inquiry_id?: string | null;
}

export interface SellerAnalytics {
  totalViews: number;
  totalFavorites: number;
  totalLeads: number;
  totalVisits: number;
  mostViewedProperty: { id: string; title: string; count: number } | null;
  mostSavedProperty: { id: string; title: string; count: number } | null;
  monthlyViews: Array<{ month: string; count: number }>;
  hasData: boolean;
}

export interface SellerNotification {
  id: string;
  type: "lead" | "save" | "visit" | "approval";
  title: string;
  message: string;
  created_at: string;
}

export interface PropertyFormState {
  title: string;
  description: string;
  type: Property["type"];
  sub_type: Property["sub_type"];
  price: string;
  area_sqft: string;
  bedrooms: string;
  bathrooms: string;
  location: string;
  city: string;
  sector: string;
  builder_name: string;
  furnishing: string;
  parking: string;
  facing: string;
  amenities: string;
  nearby_places: string;
  lat: string;
  lng: string;
  rera_number: string;
  possession: string;
  featured_image: string;
  contact_name: string;
  contact_phone: string;
  /** Default true — sellers can disable visit requests per listing. */
  site_visit_enabled: boolean;
}

export interface PropertyListFilters {
  search: string;
  status: "all" | PropertyListingStatus;
  sort: "updated" | "price_asc" | "price_desc" | "views";
}
