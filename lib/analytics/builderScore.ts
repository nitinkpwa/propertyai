import { calculateConfidence, unavailableConfidence } from "./confidence";
import { clampScore } from "./math";
import type { ComparableListing, ScoredMetric, SubjectPropertyInput } from "./types";
import { INSUFFICIENT_DATA } from "./types";

export interface BuilderStatsInput {
  /** Listings attributed to same builder in the candidate pool */
  builderListings: ComparableListing[];
  /** Optional verified rows from builder_intelligence table */
  verified?: {
    projectsDelivered?: number | null;
    delayPercent?: number | null;
    averageDelayMonths?: number | null;
    customerRating?: number | null;
    reraComplaints?: number | null;
    yearsInBusiness?: number | null;
    areaiqScore?: number | null;
  } | null;
}

/**
 * Builder score from verified builder_intelligence when present,
 * otherwise from observable listing signals only (never hardcoded ratings).
 */
export function calculateBuilderScore(
  subject: SubjectPropertyInput,
  stats: BuilderStatsInput,
): ScoredMetric {
  const name = subject.builderName?.trim();
  if (!name) {
    return {
      available: false,
      score: null,
      displayValue: INSUFFICIENT_DATA,
      message: "Builder not identified on listing",
      confidence: unavailableConfidence("No builder name on property"),
      factors: [],
    };
  }

  const v = stats.verified;
  if (v && typeof v.areaiqScore === "number" && v.areaiqScore > 0) {
    const score = clampScore(v.areaiqScore);
    return {
      available: true,
      score,
      displayValue: String(score),
      message: null,
      confidence: calculateConfidence({
        comparableCount: Math.max(3, stats.builderListings.length),
        dataQuality: 0.95,
        freshness: 0.8,
      }),
      factors: [
        {
          key: "areaiq",
          label: "AreaIQ builder score",
          weight: 100,
          score,
          available: true,
        },
      ],
    };
  }

  const hasVerifiedParts =
    v &&
    [
      v.projectsDelivered,
      v.delayPercent,
      v.averageDelayMonths,
      v.customerRating,
      v.reraComplaints,
      v.yearsInBusiness,
    ].some((x) => typeof x === "number");

  if (hasVerifiedParts && v) {
    const factors = [];
    let deliveredScore: number | null = null;
    if (typeof v.projectsDelivered === "number") {
      deliveredScore = clampScore(40 + Math.min(50, v.projectsDelivered * 4));
      factors.push({
        key: "delivered",
        label: "Projects delivered",
        weight: 25,
        score: deliveredScore,
        available: true,
      });
    }
    if (typeof v.delayPercent === "number") {
      factors.push({
        key: "delayPct",
        label: "Delay %",
        weight: 20,
        score: clampScore(100 - v.delayPercent),
        available: true,
      });
    }
    if (typeof v.averageDelayMonths === "number") {
      factors.push({
        key: "avgDelay",
        label: "Average delay",
        weight: 15,
        score: clampScore(100 - v.averageDelayMonths * 8),
        available: true,
      });
    }
    if (typeof v.customerRating === "number") {
      factors.push({
        key: "rating",
        label: "Customer ratings",
        weight: 20,
        score: clampScore((v.customerRating / 5) * 100),
        available: true,
      });
    }
    if (typeof v.reraComplaints === "number") {
      factors.push({
        key: "complaints",
        label: "RERA complaints",
        weight: 10,
        score: clampScore(100 - Math.min(100, v.reraComplaints * 15)),
        available: true,
      });
    }
    if (typeof v.yearsInBusiness === "number") {
      factors.push({
        key: "years",
        label: "Years in business",
        weight: 10,
        score: clampScore(30 + Math.min(60, v.yearsInBusiness * 4)),
        available: true,
      });
    }

    const usable = factors.filter((f) => f.available);
    const w = usable.reduce((s, f) => s + f.weight, 0);
    if (usable.length < 2 || w < 30) {
      return {
        available: false,
        score: null,
        displayValue: INSUFFICIENT_DATA,
        message: INSUFFICIENT_DATA,
        confidence: unavailableConfidence("Incomplete builder intelligence row"),
        factors,
      };
    }
    const score = clampScore(usable.reduce((s, f) => s + (f.score! * f.weight) / w, 0));
    return {
      available: true,
      score,
      displayValue: String(score),
      message: null,
      confidence: calculateConfidence({
        comparableCount: usable.length * 3,
        dataQuality: 0.9,
        freshness: 0.75,
      }),
      factors,
    };
  }

  // Observable listing signals only — never invent delivery history
  const listings = stats.builderListings;
  if (listings.length < 2) {
    return {
      available: false,
      score: null,
      displayValue: INSUFFICIENT_DATA,
      message: "Insufficient verified builder data",
      confidence: unavailableConfidence(
        `${listings.length} listing(s) for this builder — need verified builder profile or 2+ listings`,
      ),
      factors: [],
    };
  }

  const reraShare =
    listings.filter((l) => Boolean(l.reraNumber?.trim())).length / listings.length;
  const cities = new Set(listings.map((l) => l.city.trim().toLowerCase()).filter(Boolean)).size;

  const factors = [
    {
      key: "inventory",
      label: "Active listings observed",
      weight: 40,
      score: clampScore(35 + Math.min(45, listings.length * 5)),
      available: true,
    },
    {
      key: "reraShare",
      label: "RERA on listings",
      weight: 35,
      score: clampScore(40 + reraShare * 55),
      available: true,
    },
    {
      key: "cities",
      label: "Cities with inventory",
      weight: 25,
      score: clampScore(40 + Math.min(40, cities * 15)),
      available: true,
    },
  ];

  const w = factors.reduce((s, f) => s + f.weight, 0);
  const score = clampScore(factors.reduce((s, f) => s + (f.score * f.weight) / w, 0));

  return {
    available: true,
    score,
    displayValue: String(score),
    message: null,
    confidence: calculateConfidence({
      comparableCount: listings.length,
      dataQuality: 0.55,
      freshness: 0.6,
    }),
    factors,
  };
}
