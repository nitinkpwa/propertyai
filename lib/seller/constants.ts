import type { CSSProperties } from "react";
import {
  PROPERTY_STATUS_LABELS,
  type PropertyStatus,
} from "@/lib/properties/status";
import type { PropertyListingStatus } from "./types";

export { BRAND_PRIMARY as EMERALD } from "@/lib/design/colors";

export function statusLabel(status: PropertyListingStatus | string): string {
  if (status in PROPERTY_STATUS_LABELS) {
    return PROPERTY_STATUS_LABELS[status as PropertyStatus];
  }
  return status;
}

/** Shared inline styles for legacy form fields — modern neutral theme */
export const inp: CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: "12px",
  border: "1px solid #E5E7EB",
  fontSize: "14px",
  color: "#111827",
  background: "#FFFFFF",
  fontFamily: "Inter, sans-serif",
  boxSizing: "border-box",
  outline: "none",
};

export const lbl: CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 500,
  color: "#374151",
  marginBottom: "6px",
};

export const card: CSSProperties = {
  background: "#FFFFFF",
  borderRadius: "16px",
  border: "1px solid #E5E7EB",
  padding: "1.25rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)",
};

export const btnPrimary: CSSProperties = {
  background: "#4AAA27",
  color: "#fff",
  border: "none",
  padding: "10px 20px",
  borderRadius: "12px",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "Inter, sans-serif",
  boxShadow: "0 2px 8px rgba(74, 170, 39,0.25)",
};

export const btnSecondary: CSSProperties = {
  background: "#FFFFFF",
  color: "#374151",
  border: "1px solid #E5E7EB",
  padding: "8px 14px",
  borderRadius: "10px",
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "Inter, sans-serif",
};

export const btnDanger: CSSProperties = {
  background: "#FEF2F2",
  color: "#DC2626",
  border: "1px solid #FECACA",
  padding: "8px 14px",
  borderRadius: "10px",
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "Inter, sans-serif",
};

export function statusBadgeStyle(status: string): CSSProperties {
  const base: CSSProperties = {
    padding: "4px 10px",
    borderRadius: "9999px",
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "capitalize" as const,
  };

  switch (status) {
    case "active":
      return { ...base, background: "#DCFCE7", color: "#166534" };
    case "sold":
    case "rented":
      return { ...base, background: "#DBEAFE", color: "#1D4ED8" };
    case "paused":
      // Unpublished / pending review (DB has no draft value)
      return { ...base, background: "#FFEDD5", color: "#C2410C" };
    default:
      return { ...base, background: "#F3F4F6", color: "#6B7280" };
  }
}

export function statusBadgeClass(status: PropertyListingStatus | string): string {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60";
    case "sold":
    case "rented":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200/60";
    case "paused":
      return "bg-orange-50 text-orange-700 ring-1 ring-orange-200/60";
    default:
      return "bg-neutral-100 text-body ring-1 ring-neutral-200/60";
  }
}

export const CITIES = [
  "Chandigarh",
  "Mohali",
  "Panchkula",
  "Zirakpur",
  "Kharar",
  "New Chandigarh",
  "Derabassi",
  "Landran",
  "Aerocity",
  "Banur",
  "Baltana",
  "Peer Muchalla",
];

export const TYPES = [
  { value: "buy", label: "🏠 For Sale" },
  { value: "rent", label: "🔑 For Rent" },
  { value: "commercial", label: "🏢 Commercial" },
];

export const SUB_TYPES = [
  "flat",
  "plot",
  "house",
  "builder_floor",
  "sco",
  "office",
  "warehouse",
  "coworking",
];

export const FURNISHING_OPTIONS = ["Unfurnished", "Semi-Furnished", "Fully Furnished"];
export const POSSESSION_OPTIONS = ["Ready to Move", "Under Construction", "New Launch"];
export const PAGE_SIZE = 8;

export function formatPrice(p: number): string {
  return p >= 10_000_000
    ? `₹${(p / 10_000_000).toFixed(1)}Cr`
    : `₹${(p / 100_000).toFixed(0)}L`;
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
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getInitials(name?: string | null): string {
  return (
    name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "S"
  );
}

export const emptyForm = {
  title: "",
  description: "",
  type: "buy" as const,
  sub_type: "flat" as const,
  price: "",
  area_sqft: "",
  bedrooms: "",
  bathrooms: "",
  location: "",
  city: "Mohali",
  sector: "",
  builder_name: "",
  furnishing: "",
  parking: "",
  facing: "",
  amenities: "",
  nearby_places: "",
  lat: "",
  lng: "",
  rera_number: "",
  possession: "",
  featured_image: "",
  contact_name: "",
  contact_phone: "",
  site_visit_enabled: true,
};
