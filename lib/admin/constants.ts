import type { CSSProperties } from "react";

export { BRAND_PRIMARY as EMERALD } from "@/lib/design/colors";

export const ADMIN_CITIES = [
  "Chandigarh",
  "Mohali",
  "Panchkula",
  "Zirakpur",
  "Kharar",
  "New Chandigarh",
  "Aerocity",
  "IT City",
  "Landran",
  "Derabassi",
  "Banur",
  "Pinjore",
];

export const ADMIN_SUB_TYPES = [
  "flat",
  "plot",
  "house",
  "builder_floor",
  "sco",
  "office",
  "warehouse",
  "coworking",
];

export const ADMIN_TYPES = [
  { value: "buy", label: "For Sale" },
  { value: "rent", label: "For Rent" },
  { value: "commercial", label: "Commercial" },
] as const;

export const BULK_TEMPLATE = `title,type,sub_type,price,area_sqft,bedrooms,city,location,contact_name,contact_phone,description
3BHK Flat Phase 8 Mohali,buy,flat,6500000,1450,3,Mohali,Phase 8B Near IT City Mohali,Nitin Sharma,9817876600,Premium 3BHK with parking and lift
SCO Aerocity Mohali,commercial,sco,8500000,800,,Mohali,Aerocity Main Road Near Airport,Raj Kumar,9876543210,Ground floor SCO prime location`;

export const inp: CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: "12px",
  border: "1px solid #E5E7EB",
  fontSize: "14px",
  color: "#111111",
  background: "#FFFFFF",
  fontFamily: "Inter, sans-serif",
  boxSizing: "border-box",
  outline: "none",
};

export const lbl: CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 500,
  color: "#4B5563",
  marginBottom: "6px",
};

export function formatPrice(price: number): string {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
  return `₹${(price / 100000).toFixed(0)}L`;
}

export function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(d: string): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
