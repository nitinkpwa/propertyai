import type { BHKOption, PropertyCardProps } from "../../components/PropertyCard";
import type { AreaIntelligenceReport } from "@/lib/intelligence/types";

export interface AISummary {
  summary: string;
  pros: string[];
  cons: string[];
  investmentScore: number | null;
  riskLevel: "Low" | "Moderate" | "High" | null;
}

export interface FloorPlan {
  bhk: BHKOption;
  area: number;
  price: number;
  label: string;
}

export interface NearbyPlace {
  name: string;
  distance: string;
  type: "airport" | "school" | "hospital" | "mall" | "metro" | "it";
}

export interface BuilderInfo {
  name: string;
  logoInitials: string;
  yearsExperience: number | null;
  projectsDelivered: number | null;
}

export interface PropertyDetail {
  id: string;
  name: string;
  project: string;
  builder: BuilderInfo;
  location: string;
  city: string;
  price: number;
  pricePerSqFt: number;
  propertyType: string;
  bhk: BHKOption;
  area: number;
  status: string;
  possession: string;
  configuration: string;
  totalFloors: number | null;
  parking: string;
  facing: string;
  furnishing: string;
  description: string;
  aiVerified: boolean;
  reraVerified: boolean;
  images: { id: string; label: string; gradient: string; url?: string | null }[];
  amenities: string[];
  intelligenceReport?: AreaIntelligenceReport | null;
  aiSummary: AISummary;
  floorPlans: FloorPlan[];
  nearbyPlaces: NearbyPlace[];
  similarProperties: PropertyCardProps[];
  contactPhone: string;
  whatsapp: string;
}

export function formatPrice(price: number): string {
  if (price >= 10_000_000) {
    const cr = price / 10_000_000;
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2).replace(/\.?0+$/, "")} Cr`;
  }
  if (price >= 100_000) {
    const lakhs = price / 100_000;
    return `₹${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(2).replace(/\.?0+$/, "")} L`;
  }
  return `₹${price.toLocaleString("en-IN")}`;
}
