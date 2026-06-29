export const BUYER_NAV = [
  { href: "/buyer", label: "Dashboard", icon: "dashboard" as const },
  { href: "/buyer/saved", label: "Saved Properties", icon: "heart" as const },
  { href: "/buyer/compare", label: "Compare", icon: "compare" as const },
  { href: "/buyer/site-visits", label: "Site Visits", icon: "calendar" as const },
  { href: "/buyer/profile", label: "Profile", icon: "user" as const },
] as const;

export const BUDGET_PRESETS = [
  { label: "Any Budget", min: null, max: null },
  { label: "Under ₹30L", min: 0, max: 3_000_000 },
  { label: "₹30L – ₹60L", min: 3_000_000, max: 6_000_000 },
  { label: "₹60L – ₹1Cr", min: 6_000_000, max: 10_000_000 },
  { label: "₹1Cr – ₹2Cr", min: 10_000_000, max: 20_000_000 },
  { label: "Above ₹2Cr", min: 20_000_000, max: null },
] as const;

export const CITY_OPTIONS = [
  "Chandigarh",
  "Mohali",
  "Panchkula",
  "Zirakpur",
  "Kharar",
  "New Chandigarh",
  "Aerocity",
  "Derabassi",
] as const;

export const PROPERTY_TYPE_PRESETS = [
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa" },
  { value: "plot", label: "Plot" },
  { value: "builder-floor", label: "Builder Floor" },
  { value: "commercial", label: "Commercial" },
  { value: "office", label: "Office" },
  { value: "shop", label: "Shop" },
] as const;

export function isBuyerNavActive(href: string, pathname: string): boolean {
  if (href === "/buyer") return pathname === "/buyer";
  return pathname === href || pathname.startsWith(`${href}/`);
}
