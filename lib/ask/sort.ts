import type { ListingProperty } from "@/lib/properties/types";
import type { AskSortDirection, AskSortKey } from "./types";

export function sortAskListings(
  listings: ListingProperty[],
  key: AskSortKey,
  direction: AskSortDirection,
): ListingProperty[] {
  const sorted = [...listings].sort((a, b) => {
    const left =
      key === "price"
        ? a.price
        : key === "rentalYield"
          ? a.rentalYield ?? -1
          : a.growthScore ?? -1;
    const right =
      key === "price"
        ? b.price
        : key === "rentalYield"
          ? b.rentalYield ?? -1
          : b.growthScore ?? -1;

    return direction === "asc" ? left - right : right - left;
  });

  return sorted;
}

export function toggleSortDirection(direction: AskSortDirection): AskSortDirection {
  return direction === "asc" ? "desc" : "asc";
}

export function sortLabel(key: AskSortKey): string {
  if (key === "price") return "Price";
  if (key === "rentalYield") return "Rental Yield";
  return "AreaIQ Score";
}
