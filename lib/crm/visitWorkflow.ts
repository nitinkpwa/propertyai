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

export function formatVisitStatusLabel(status?: string | null): string {
  if (!status || typeof status !== "string") return "Unknown";
  return VISIT_STATUS_LABELS[status as VisitStatus] ?? status.replace(/_/g, " ");
}

export function isApprovedVisitStatus(status: string): boolean {
  return status === "accepted" || status === "scheduled" || status === "rescheduled";
}

/** Active pipeline statuses that can still appear in Upcoming (if date is today/future). */
export function isActiveVisitPipelineStatus(status: string): boolean {
  return status === "pending_approval" || isApprovedVisitStatus(status);
}

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function getVisitDateIso(visit: { visit_date?: string | null }): string | null {
  const date = (visit.visit_date ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

/**
 * Upcoming = still in pipeline AND visit_date >= today.
 * Past-dated pending/approved visits automatically move to History.
 * Expired / completed / cancelled never appear in Upcoming.
 */
export function isVisitUpcoming(visit: {
  status: string;
  visit_date?: string | null;
}): boolean {
  if (!isActiveVisitPipelineStatus(visit.status)) return false;
  const date = getVisitDateIso(visit);
  if (!date) return false;
  return date >= todayIsoDate();
}

export function isVisitPast(visit: {
  status: string;
  visit_date?: string | null;
}): boolean {
  return !isVisitUpcoming(visit);
}

export function isVisitToday(visit: {
  status: string;
  visit_date?: string | null;
}): boolean {
  if (!isVisitUpcoming(visit)) return false;
  return getVisitDateIso(visit) === todayIsoDate();
}

export function isVisitTomorrow(visit: {
  status: string;
  visit_date?: string | null;
}): boolean {
  if (!isVisitUpcoming(visit)) return false;
  return getVisitDateIso(visit) === addDaysIso(todayIsoDate(), 1);
}

/** Later than tomorrow but still upcoming (not expired). */
export function isVisitLaterUpcoming(visit: {
  status: string;
  visit_date?: string | null;
}): boolean {
  if (!isVisitUpcoming(visit)) return false;
  const date = getVisitDateIso(visit);
  if (!date) return false;
  return date > addDaysIso(todayIsoDate(), 1);
}

export type VisitBucket = "today" | "tomorrow" | "upcoming" | "history";

export function getVisitBucket(visit: {
  status: string;
  visit_date?: string | null;
}): VisitBucket {
  if (isVisitToday(visit)) return "today";
  if (isVisitTomorrow(visit)) return "tomorrow";
  if (isVisitUpcoming(visit)) return "upcoming";
  return "history";
}

/** Upcoming sort: date ASC, then Approved before Pending, then time ASC. */
export function compareUpcomingVisits(
  a: { status: string; visit_date?: string | null; visit_time?: string | null },
  b: { status: string; visit_date?: string | null; visit_time?: string | null },
): number {
  const da = (a.visit_date ?? "").slice(0, 10);
  const db = (b.visit_date ?? "").slice(0, 10);
  if (da !== db) return da.localeCompare(db);

  const rank = (status: string) => {
    if (isApprovedVisitStatus(status)) return 0;
    if (status === "pending_approval") return 1;
    return 2;
  };
  const rd = rank(a.status) - rank(b.status);
  if (rd !== 0) return rd;

  return (a.visit_time ?? "").localeCompare(b.visit_time ?? "");
}

/** Past/History sort: newest date first. */
export function comparePastVisits(
  a: { visit_date?: string | null; visit_time?: string | null },
  b: { visit_date?: string | null; visit_time?: string | null },
): number {
  const da = (a.visit_date ?? "").slice(0, 10);
  const db = (b.visit_date ?? "").slice(0, 10);
  if (da !== db) return db.localeCompare(da);
  return (b.visit_time ?? "").localeCompare(a.visit_time ?? "");
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
