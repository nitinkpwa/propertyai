import type {
  Amenity,
  ListingType,
  PossessionStatus,
  PropertyType,
} from "./types";

export { BRAND_PRIMARY as EMERALD } from "@/lib/design/colors";

export const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] =
  [
    { value: "apartment", label: "Apartment" },
    { value: "villa", label: "Villa" },
    { value: "plot", label: "Plot" },
    { value: "builder-floor", label: "Builder Floor" },
    { value: "commercial", label: "Commercial" },
    { value: "office", label: "Office" },
    { value: "shop", label: "Shop" },
  ];

export const LISTING_TYPE_OPTIONS: { value: ListingType; label: string }[] = [
  { value: "buy", label: "Buy" },
  { value: "rent", label: "Rent" },
];

export const BHK_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "1 BHK" },
  { value: 2, label: "2 BHK" },
  { value: 3, label: "3 BHK" },
  { value: 4, label: "4 BHK" },
  { value: 5, label: "5+ BHK" },
];

export const LOCATION_OPTIONS = [
  "Mohali",
  "Aerocity",
  "Zirakpur",
  "Panchkula",
  "New Chandigarh",
  "Kharar",
  "Derabassi",
];

export const POSSESSION_OPTIONS: {
  value: PossessionStatus;
  label: string;
}[] = [
  { value: "ready", label: "Ready to Move" },
  { value: "under-construction", label: "Under Construction" },
  { value: "new-launch", label: "New Launch" },
];

export const AMENITY_OPTIONS: { value: Amenity; label: string }[] = [
  { value: "club-house", label: "Club House" },
  { value: "gym", label: "Gym" },
  { value: "swimming-pool", label: "Swimming Pool" },
  { value: "parking", label: "Parking" },
  { value: "power-backup", label: "Power Backup" },
  { value: "lift", label: "Lift" },
  { value: "garden", label: "Garden" },
  { value: "security", label: "Security" },
];

export const AI_FILTER_OPTIONS: {
  key: keyof import("./types").AIFilterFlags;
  label: string;
}[] = [
  { key: "highAreaIQScore", label: "AreaIQ Score" },
  { key: "highRentalYield", label: "Rental Yield" },
  { key: "highAppreciation", label: "High Appreciation" },
  { key: "bestInvestment", label: "Best Investment" },
  { key: "verifiedOnly", label: "Verified Only" },
  { key: "reraOnly", label: "RERA Only" },
];

export const BUDGET_MIN = 0;
export const BUDGET_MAX = 20_000_000;
export const BUDGET_STEP = 100_000;

export const AREA_MIN = 0;
export const AREA_MAX = 5_000;
export const AREA_STEP = 50;
