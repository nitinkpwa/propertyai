/**
 * Real Estate Knowledge taxonomy for AreaIQ Intelligence.
 * Used by the Intent Parser and validation rules — not for LLM hallucination.
 */

export const PROPERTY_TYPE_ALIASES: Record<string, StructuredPropertyType> = {
  apartment: "apartment",
  apartments: "apartment",
  flat: "flat",
  flats: "flat",
  villa: "villa",
  villas: "villa",
  "independent house": "house",
  house: "house",
  duplex: "house",
  penthouse: "apartment",
  studio: "apartment",
  plot: "plot",
  plots: "plot",
  commercial: "commercial",
  office: "office",
  retail: "shop",
  shop: "shop",
  sco: "sco",
  warehouse: "warehouse",
  industrial: "warehouse",
  "builder floor": "builder_floor",
  "builder floors": "builder_floor",
};

export type StructuredPropertyType =
  | "apartment"
  | "flat"
  | "villa"
  | "plot"
  | "house"
  | "office"
  | "commercial"
  | "warehouse"
  | "sco"
  | "shop"
  | "builder_floor";

/** Map structured type → DB sub_type */
export function toDbSubType(
  type: StructuredPropertyType | null,
): "flat" | "plot" | "house" | "sco" | "office" | "warehouse" | "coworking" | "builder_floor" | null {
  if (!type) return null;
  switch (type) {
    case "apartment":
    case "flat":
      return "flat";
    case "villa":
    case "house":
      return "house";
    case "plot":
      return "plot";
    case "office":
      return "office";
    case "warehouse":
      return "warehouse";
    case "sco":
      return "sco";
    case "shop":
    case "commercial":
      return "office";
    case "builder_floor":
      return "builder_floor";
    default:
      return null;
  }
}

export const TRICITY_CITIES = [
  "Mohali",
  "Chandigarh",
  "Panchkula",
  "Zirakpur",
  "Kharar",
  "New Chandigarh",
  "Aerocity",
  "Derabassi",
  "Landran",
  "Banur",
] as const;

export const CONFIGURATION_PATTERN =
  /\b([1-5])\s*(?:bhk|b\.?h\.?k|rk|bedroom|bed)\b/i;

export const AREA_UNITS = ["sq ft", "sqft", "sq yard", "sqyd", "marla", "kanal", "acre", "acres"] as const;

export const BUDGET_UNITS = {
  lakh: 100_000,
  lac: 100_000,
  lakhs: 100_000,
  crore: 10_000_000,
  cr: 10_000_000,
  crores: 10_000_000,
} as const;

export const REAL_ESTATE_CONCEPTS = [
  "Apartment",
  "Flat",
  "Villa",
  "Independent House",
  "Plot",
  "Commercial",
  "Office",
  "Retail",
  "SCO",
  "Warehouse",
  "Industrial",
  "Studio",
  "Duplex",
  "Penthouse",
  "1RK",
  "1BHK",
  "2BHK",
  "3BHK",
  "4BHK",
  "5BHK",
  "Sq Ft",
  "Sq Yard",
  "Marla",
  "Kanal",
  "Acres",
  "Lakh",
  "Crore",
  "Price per Sq Ft",
  "Ready to Move",
  "Possession",
  "RERA",
  "Registry",
  "Leasehold",
  "Freehold",
] as const;

export const UNAVAILABLE_COPY =
  "This information is currently unavailable in AreaIQ Intelligence.";
