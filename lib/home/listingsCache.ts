import { getLiveProperties } from "@/lib/properties/getLiveProperties";
import { mapPropertyRowToListing } from "@/lib/properties/queries";
import type { ListingProperty } from "@/lib/properties/types";

/** In-flight / short-TTL cache so homepage sections share one listings fetch. */
const TTL_MS = 30_000;

let cached: ListingProperty[] | null = null;
let cachedAt = 0;
let inflight: Promise<ListingProperty[]> | null = null;

export function getCachedListingProperties(): Promise<ListingProperty[]> {
  const now = Date.now();
  if (cached && now - cachedAt < TTL_MS) {
    return Promise.resolve(cached);
  }

  if (!inflight) {
    inflight = getLiveProperties({ includeSeller: true })
      .then((rows) => {
        cached = rows.map((row) => mapPropertyRowToListing(row));
        cachedAt = Date.now();
        return cached;
      })
      .finally(() => {
        inflight = null;
      });
  }

  return inflight;
}
