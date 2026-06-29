import type { PropertySearchFilters } from "./types";
import type { AskSortKey } from "./types";
import type { PossessionStatus } from "@/lib/properties/types";

export const STARTER_SUGGESTIONS = [
  "3 BHK under ₹80 lakh in Mohali",
  "Flats near Airport Road",
  "Best investment under ₹1 crore",
  "Compare Aerocity vs New Chandigarh",
  "Villas in New Chandigarh",
] as const;

export const QUICK_ACTIONS = [
  "Compare these",
  "Ready to Move",
  "Higher Rental Yield",
  "Near Schools",
  "Near Airport",
  "Investment Only",
  "Lowest Price",
  "Luxury",
  "Builder Floors",
] as const;

export type QuickAction = (typeof QUICK_ACTIONS)[number];

export const FOLLOW_UP_OPTIONS = [
  "Show cheaper options",
  "Show nearby projects",
  "Ready to move",
  "Rental properties",
  "Calculate EMI",
  "Compare builders",
] as const;

export type FollowUpOption = (typeof FOLLOW_UP_OPTIONS)[number];

export interface QuickActionConfig {
  label: QuickAction;
  appendQuery?: string;
  sortKey?: AskSortKey;
  sortDirection?: "asc" | "desc";
  possession?: PossessionStatus[];
  filterInvestment?: boolean;
  filterLuxury?: boolean;
  filterBuilderFloor?: boolean;
  compareMode?: boolean;
}

export interface FollowUpConfig {
  label: FollowUpOption;
  userMessage: string;
  appendQuery?: string;
  sortKey?: AskSortKey;
  sortDirection?: "asc" | "desc";
  possession?: PossessionStatus[];
  compareMode?: boolean;
  emiMode?: boolean;
}

export function getQuickActionConfig(label: QuickAction): QuickActionConfig {
  switch (label) {
    case "Compare these":
      return { label, compareMode: true };
    case "Ready to Move":
      return { label, possession: ["ready"], appendQuery: "ready to move" };
    case "Higher Rental Yield":
      return { label, sortKey: "rentalYield", sortDirection: "desc", appendQuery: "high rental yield" };
    case "Near Schools":
      return { label, appendQuery: "near schools Mohali" };
    case "Near Airport":
      return { label, appendQuery: "near airport Aerocity" };
    case "Investment Only":
      return { label, filterInvestment: true, appendQuery: "investment property" };
    case "Lowest Price":
      return { label, sortKey: "price", sortDirection: "asc" };
    case "Luxury":
      return { label, filterLuxury: true, appendQuery: "luxury villa premium" };
    case "Builder Floors":
      return { label, filterBuilderFloor: true, appendQuery: "builder floor" };
    default:
      return { label };
  }
}

export function getFollowUpConfig(label: FollowUpOption): FollowUpConfig {
  switch (label) {
    case "Show cheaper options":
      return {
        label,
        userMessage: "Show cheaper options",
        sortKey: "price",
        sortDirection: "asc",
        appendQuery: "cheaper lower budget",
      };
    case "Show nearby projects":
      return {
        label,
        userMessage: "Show nearby projects",
        appendQuery: "nearby projects",
      };
    case "Ready to move":
      return {
        label,
        userMessage: "Show ready to move properties",
        possession: ["ready"],
        appendQuery: "ready to move",
      };
    case "Rental properties":
      return {
        label,
        userMessage: "Show rental properties",
        appendQuery: "for rent rental",
      };
    case "Calculate EMI":
      return { label, userMessage: "Calculate EMI for these properties", emiMode: true };
    case "Compare builders":
      return {
        label,
        userMessage: "Compare builders for these properties",
        compareMode: true,
      };
    default:
      return { label, userMessage: label };
  }
}

export function getFollowUpsForIntent(intent: import("./types").AskIntent): readonly FollowUpOption[] {
  if (intent === "search" || intent === "investment") {
    return FOLLOW_UP_OPTIONS;
  }
  return ["Show nearby projects", "Ready to move", "Calculate EMI"] as const;
}

export function getQuickActionsForResults(hasResults: boolean): readonly QuickAction[] {
  if (!hasResults) return [];
  return QUICK_ACTIONS;
}

export function mergeFollowUpFilters(
  base: PropertySearchFilters,
  possession?: PossessionStatus[],
): PropertySearchFilters {
  if (!possession?.length) return base;
  return { ...base, possession: possession[0] ?? null };
}
