import type { VisitStatus } from "./types";

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  pending_approval: "Pending",
  accepted: "Approved",
  scheduled: "Approved",
  rescheduled: "Rescheduled",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const VISIT_STATUS_BUYER_ORDER: VisitStatus[] = [
  "pending_approval",
  "accepted",
  "scheduled",
  "rescheduled",
  "completed",
  "cancelled",
];

export const VISIT_STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "pending_approval", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rejected", label: "Rejected" },
] as const;

/** Buyer may see seller/builder contact only after approval. */
export function buyerCanSeeOwnerContact(status: VisitStatus | string): boolean {
  return (
    status === "accepted" ||
    status === "scheduled" ||
    status === "rescheduled" ||
    status === "completed"
  );
}

/** Master/admin always has full access. */
export function roleCanSeeAllContact(role: string | null | undefined): boolean {
  return role === "admin";
}

/** Seller/connect see buyer details on visits they manage. */
export function sellerCanSeeBuyerContact(_status: VisitStatus | string): boolean {
  return true;
}

export function formatVisitStatusLabel(status: string): string {
  return VISIT_STATUS_LABELS[status as VisitStatus] ?? status.replace(/_/g, " ");
}

export function isApprovedVisitStatus(status: string): boolean {
  return status === "accepted" || status === "scheduled" || status === "rescheduled";
}

export function matchesVisitStatusFilter(status: string, filter: string): boolean {
  if (filter === "all") return true;
  if (filter === "approved") return isApprovedVisitStatus(status);
  if (filter === "cancelled") return status === "cancelled";
  return status === filter;
}

/** Parse structured fields stored in the purpose payload string. */
export function parseVisitPurposeMeta(purpose?: string | null): {
  notes: string | null;
  language: string | null;
  loanRequired: string | null;
  transport: string | null;
  visitors: string | null;
  rawPurpose: string | null;
} {
  if (!purpose?.trim()) {
    return {
      notes: null,
      language: null,
      loanRequired: null,
      transport: null,
      visitors: null,
      rawPurpose: null,
    };
  }

  const parts = purpose.split(" · ").map((p) => p.trim()).filter(Boolean);
  let notes: string | null = null;
  let language: string | null = null;
  let loanRequired: string | null = null;
  let transport: string | null = null;
  let visitors: string | null = null;
  const other: string[] = [];

  for (const part of parts) {
    if (part.startsWith("Notes:")) notes = part.replace(/^Notes:\s*/, "");
    else if (part.startsWith("Language:")) language = part.replace(/^Language:\s*/, "");
    else if (part.startsWith("Home loan assistance:")) {
      loanRequired = part.replace(/^Home loan assistance:\s*/, "");
    } else if (part.startsWith("Arrival:")) transport = part.replace(/^Arrival:\s*/, "");
    else if (part.startsWith("Visitors:")) visitors = part.replace(/^Visitors:\s*/, "");
    else other.push(part);
  }

  return {
    notes,
    language,
    loanRequired,
    transport,
    visitors,
    rawPurpose: other.length ? other.join(" · ") : null,
  };
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
