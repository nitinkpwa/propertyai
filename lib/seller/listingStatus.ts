/**
 * Seller-facing listing labels mapped from DB `status` + nearby_places.meta.publishing.
 * DB values remain: active | sold | rented | paused
 */

import {
  extractPropertyMeta,
  type PropertyStructuredMeta,
} from "@/lib/properties/nearbyPlacesMeta";
import {
  PROPERTY_STATUS,
  type PropertyStatus,
} from "@/lib/properties/status";

export type SellerListingBadge =
  | "Draft"
  | "Pending Review"
  | "Approved"
  | "Rejected"
  | "Sold"
  | "Rented";

export function getSellerWorkflow(
  nearbyPlaces: unknown,
): string | undefined {
  return extractPropertyMeta(nearbyPlaces)?.publishing?.workflowStatus;
}

export function sellerListingBadge(
  status: PropertyStatus | string,
  nearbyPlaces?: unknown,
): SellerListingBadge {
  if (status === PROPERTY_STATUS.SOLD) return "Sold";
  if (status === PROPERTY_STATUS.RENTED) return "Rented";
  if (status === PROPERTY_STATUS.ACTIVE) return "Approved";

  const workflow = getSellerWorkflow(nearbyPlaces);
  if (workflow === "draft") return "Draft";
  if (workflow === "archived" || workflow === "rejected") return "Rejected";
  // paused + review / approved / missing meta → awaiting AreaIQ publish
  return "Pending Review";
}

export function sellerListingBadgeClass(badge: SellerListingBadge): string {
  switch (badge) {
    case "Approved":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60";
    case "Pending Review":
      return "bg-amber-50 text-amber-800 ring-1 ring-amber-200/60";
    case "Draft":
      return "bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200/60";
    case "Rejected":
      return "bg-red-50 text-red-700 ring-1 ring-red-200/60";
    case "Sold":
    case "Rented":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200/60";
    default:
      return "bg-neutral-100 text-body ring-1 ring-neutral-200/60";
  }
}

/** Filter value used in My Properties dropdown (DB status or workflow key). */
export type SellerStatusFilter =
  | "all"
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "sold"
  | "rented";

export function matchesSellerStatusFilter(
  status: string,
  nearbyPlaces: unknown,
  filter: SellerStatusFilter,
): boolean {
  if (filter === "all") return true;
  const badge = sellerListingBadge(status, nearbyPlaces);
  const map: Record<Exclude<SellerStatusFilter, "all">, SellerListingBadge> = {
    draft: "Draft",
    pending_review: "Pending Review",
    approved: "Approved",
    rejected: "Rejected",
    sold: "Sold",
    rented: "Rented",
  };
  return badge === map[filter];
}

export function workflowForSellerSave(asDraft: boolean): string {
  return asDraft ? "draft" : "review";
}

export function patchPublishingWorkflow(
  meta: PropertyStructuredMeta,
  workflowStatus: string,
): PropertyStructuredMeta {
  return {
    ...meta,
    publishing: {
      ...meta.publishing,
      workflowStatus,
    },
  };
}
