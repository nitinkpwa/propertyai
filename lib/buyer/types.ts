import type { PropertyCardProps, BHKOption } from "@/app/components/PropertyCard";
import type { Profile } from "@/lib/supabase";

export interface BuyerStats {
  savedCount: number;
  comparedCount: number;
  upcomingVisitsCount: number;
}

export interface SavedPropertyRow {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
  property: Record<string, unknown> | null;
}

export interface ComparedPropertyRow {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
  property: Record<string, unknown> | null;
}

export interface PropertyViewRow {
  id: string;
  property_id: string;
  viewed_at: string;
  property: Record<string, unknown> | null;
}

export interface SiteVisitRow {
  id: string;
  property_id: string;
  visit_date: string;
  visit_time: string;
  status:
    | "pending_approval"
    | "accepted"
    | "scheduled"
    | "rescheduled"
    | "completed"
    | "rejected"
    | "cancelled";
  purpose: string | null;
  visit_location: string | null;
  builder_name: string | null;
  checklist: string[] | null;
  property: {
    title?: string;
    location?: string;
    city?: string;
  } | null;
}

export interface BuyerProfileUpdate {
  full_name: string;
  phone: string;
  city: string;
  budget_min: number | null;
  budget_max: number | null;
  preferred_locations: string[];
  preferred_property_types: string[];
}

export type BuyerPropertyCard = PropertyCardProps & { savedRowId?: string; compareRowId?: string };

export function toBhkOption(bedrooms: number | null | undefined): BHKOption {
  if (bedrooms === 4) return 4;
  if (bedrooms === 3) return 3;
  return 2;
}

export function isBuyerRole(role?: Profile["role"] | null): boolean {
  return !role || role === "buyer";
}
