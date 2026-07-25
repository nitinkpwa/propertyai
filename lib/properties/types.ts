import type { PropertyCardProps } from "@/app/components/PropertyCard";
import type { LegalComplianceLevel } from "@/lib/properties/legalCompliance";

export type PropertyType =
  | "apartment"
  | "villa"
  | "plot"
  | "builder-floor"
  | "commercial"
  | "office"
  | "shop";

export type ListingType = "buy" | "rent";

export type PossessionStatus =
  | "ready"
  | "under-construction"
  | "new-launch";

export type Amenity =
  | "club-house"
  | "gym"
  | "swimming-pool"
  | "parking"
  | "power-backup"
  | "lift"
  | "garden"
  | "security";

export interface ListingProperty extends PropertyCardProps {
  propertyType: PropertyType;
  listingType: ListingType;
  possession: PossessionStatus;
  amenities: Amenity[];
}

export interface AIFilterFlags {
  highAreaIQScore: boolean;
  highRentalYield: boolean;
  highAppreciation: boolean;
  bestInvestment: boolean;
  /** Legal compliance ≥ 90% */
  verifiedOnly: boolean;
  documentsVerified: boolean;
  documentsPartial: boolean;
  documentsMissing: boolean;
}

export interface PropertyFilterState {
  propertyTypes: PropertyType[];
  listingType: ListingType | null;
  minPrice: number | null;
  maxPrice: number | null;
  bhk: number[];
  location: string | null;
  builder: string | null;
  possession: PossessionStatus[];
  minArea: number | null;
  maxArea: number | null;
  amenities: Amenity[];
  ai: AIFilterFlags;
}

export const DEFAULT_FILTER_STATE: PropertyFilterState = {
  propertyTypes: [],
  listingType: null,
  minPrice: null,
  maxPrice: null,
  bhk: [],
  location: null,
  builder: null,
  possession: [],
  minArea: null,
  maxArea: null,
  amenities: [],
  ai: {
    highAreaIQScore: false,
    highRentalYield: false,
    highAppreciation: false,
    bestInvestment: false,
    verifiedOnly: false,
    documentsVerified: false,
    documentsPartial: false,
    documentsMissing: false,
  },
};

/** Shape for a future Supabase `.select()` + filter builder. */
export interface SupabasePropertyFilters {
  propertyTypes?: PropertyType[];
  listingType?: ListingType;
  minPrice?: number;
  maxPrice?: number;
  bhk?: number[];
  location?: string;
  builder?: string;
  possession?: PossessionStatus[];
  minArea?: number;
  maxArea?: number;
  amenities?: Amenity[];
  aiVerified?: boolean;
  reraVerified?: boolean;
  /** Legal documents compliance level filter(s). */
  documentsCompliance?: LegalComplianceLevel[];
  minGrowthScore?: number;
  minRentalYield?: number;
}
