/**
 * Placeholder market intelligence for map areas that lack live listings yet.
 * Live listing-derived scores always win when inventory exists.
 */

import type { BandLevel } from "@/lib/home/terminalTypes";

export type AreaPlaceholderIntel = {
  avgAreaIqScore: number;
  marketConfidence: number;
  demand: BandLevel;
  supply: BandLevel;
  /** Indicative average ticket (INR) for empty zones */
  averagePrice: number;
  avgRentalYield: number;
  avgGrowthScore: number;
  risk: BandLevel;
  investmentScore: number;
  tag: string;
};

/** Keys = PLACE_GRAPH / map area ids */
export const AREA_PLACEHOLDER_INTEL: Record<string, AreaPlaceholderIntel> = {
  dhakoli: {
    avgAreaIqScore: 76,
    marketConfidence: 72,
    demand: "medium",
    supply: "medium",
    averagePrice: 5_800_000,
    avgRentalYield: 3.9,
    avgGrowthScore: 74,
    risk: "medium",
    investmentScore: 75,
    tag: "Zirakpur growth pocket",
  },
  "peer-muchalla": {
    avgAreaIqScore: 78,
    marketConfidence: 74,
    demand: "medium",
    supply: "medium",
    averagePrice: 6_200_000,
    avgRentalYield: 4.0,
    avgGrowthScore: 76,
    risk: "medium",
    investmentScore: 77,
    tag: "VIP Road corridor",
  },
};

export function getAreaPlaceholderIntel(
  areaId: string,
): AreaPlaceholderIntel | null {
  return AREA_PLACEHOLDER_INTEL[areaId] ?? null;
}
