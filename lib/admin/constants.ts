import type { CSSProperties } from "react";
import { formatInrAmount } from "@/lib/properties/pricingDisplay";
import { getAdminCityOptions } from "@/lib/location/registry";

export { BRAND_PRIMARY as EMERALD } from "@/lib/design/colors";

/** Derived from Area Registry — do not hardcode new areas here. */
export const ADMIN_CITIES = getAdminCityOptions();

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
SCO Aerocity Mohali,commercial,sco,8500000,800,,Mohali,Aerocity Main Road Near Airport,Raj Kumar,9876543210,Ground floor SCO prime location
2BHK Flat Dhakoli,buy,flat,4800000,1100,2,Dhakoli,Dhakoli Near Patiala Road,Anita Verma,9876501234,Value segment 2BHK in Dhakoli
3BHK Peer Muchalla,buy,flat,6200000,1350,3,Peer Muchalla,Peer Muchalla VIP Road,Suresh Mehta,9812345678,Mid-premium flat on VIP Road belt`;

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
  if (!price || price <= 0) return "Price on Request";
  // Never show unit-rate-sized values as market price on admin surfaces
  if (price < 100_000) return "Price on Request";
  return formatInrAmount(price);
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
