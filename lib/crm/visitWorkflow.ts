import type { VisitStatus } from "./types";

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  pending_approval: "Pending Approval",
  accepted: "Accepted",
  scheduled: "Scheduled",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const VISIT_STATUS_BUYER_ORDER: VisitStatus[] = [
  "pending_approval",
  "accepted",
  "scheduled",
  "completed",
];

/** Buyer may see seller/builder contact only after approval. */
export function buyerCanSeeOwnerContact(status: VisitStatus): boolean {
  return status === "accepted" || status === "scheduled" || status === "completed";
}

/** Master/admin always has full access. */
export function roleCanSeeAllContact(role: string | null | undefined): boolean {
  return role === "admin";
}

/** Seller/connect see buyer details on visits they manage. */
export function sellerCanSeeBuyerContact(_status: VisitStatus): boolean {
  return true;
}

export function formatVisitStatusLabel(status: string): string {
  return VISIT_STATUS_LABELS[status as VisitStatus] ?? status.replace(/_/g, " ");
}

export const DEFAULT_VISIT_CHECKLIST = [
  "Verify Registry",
  "Verify RERA",
  "Check Parking",
  "Check Water Supply",
  "Check Lift",
  "Check Construction Quality",
  "Check Road Width",
  "Check Power Backup",
  "Ask Maintenance Charges",
  "Compare Nearby Projects",
] as const;

export function buildPropertyChecklist(input: {
  propertyType?: string | null;
  hasRera?: boolean;
  hasParking?: boolean;
}): string[] {
  const items = [...DEFAULT_VISIT_CHECKLIST];
  if (!input.hasRera) {
    return items.filter((i) => i !== "Verify RERA");
  }
  if (input.propertyType?.toLowerCase().includes("plot")) {
    return items.filter((i) => !["Check Lift", "Check Water Supply"].includes(i));
  }
  return items;
}

export interface VisitFeedbackPayload {
  notes?: string;
  parkingRating?: number;
  builderBehaviour?: number;
  constructionRating?: number;
  wouldBuy?: boolean;
  additionalComments?: string;
  photoUrls?: string[];
}
