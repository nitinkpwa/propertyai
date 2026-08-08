/**
 * AreaIQ Confidence Engine — never invent data, never leave a dead end.
 *
 * Low confidence → answer what IS verified + help the buyer continue.
 */

import type { AskEngineResponse, HandlerContext, IntentClassification } from "./types";
import { classificationToResponseFields } from "./types";

export type ConfidenceBreakdown = {
  property: number;
  builder: number;
  market: number;
  document: number;
  location: number;
  overall: number;
};

export type ConfidenceBand = "high" | "medium" | "low";

/** Buyer-facing intelligence level for UI badges */
export type IntelligenceLevel = "full" | "partial";

/** Answer confidently */
export const CONFIDENCE_HIGH = 90;
/** Answer verified data; brief limitations */
export const CONFIDENCE_MEDIUM = 70;
/**
 * Legacy gate number — used only for "thin evidence" labeling.
 * We never refuse solely because overall < this value.
 */
const LEGACY_REFUSE_THRESHOLD = 42;

export function confidenceBand(overall: number): ConfidenceBand {
  if (overall >= CONFIDENCE_HIGH) return "high";
  if (overall >= CONFIDENCE_MEDIUM) return "medium";
  return "low";
}

export function assessConfidence(
  classification: IntentClassification,
  extras?: {
    propertyCount?: number;
    hasPropertyContext?: boolean;
    hasBuilderData?: boolean;
    pipelineConfidence?: number | null;
    hasAnalytics?: boolean;
  },
): ConfidenceBreakdown {
  const loc =
    classification.location ||
    classification.entities.city ||
    classification.entities.locality
      ? 78
      : 35;
  const builder = classification.builder || extras?.hasBuilderData ? 72 : 40;
  const property =
    extras?.hasPropertyContext
      ? 88
      : (extras?.propertyCount ?? 0) > 0
        ? Math.min(92, 55 + (extras?.propertyCount ?? 0) * 8)
        : classification.intent === "PROPERTY_SEARCH"
          ? 28
          : 45;
  const document = extras?.hasAnalytics ? 75 : 38;
  const marketHeavy =
    classification.intent === "MARKET_TREND" ||
    classification.intent === "INVESTMENT" ||
    classification.intent === "LOCALITY" ||
    classification.intent === "FINANCE";
  // Honest market score — do NOT artificially force below refuse threshold
  const market = marketHeavy
    ? extras?.hasAnalytics
      ? 72
      : loc >= 60
        ? 48
        : 32
    : loc >= 60
      ? 65
      : 48;

  let overall = Math.round(
    property * 0.28 + builder * 0.18 + market * 0.22 + document * 0.12 + loc * 0.2,
  );

  if (typeof extras?.pipelineConfidence === "number") {
    overall = Math.round(overall * 0.45 + extras.pipelineConfidence * 0.55);
  }

  if (classification.confidence < 0.5) {
    overall = Math.min(overall, Math.round(classification.confidence * 100));
  }

  return {
    property: clamp(property),
    builder: clamp(builder),
    market: clamp(market),
    document: clamp(document),
    location: clamp(loc),
    overall: clamp(overall),
  };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** @deprecated Prefer confidenceBand — kept for call sites that check thin evidence */
export function isBelowConfidenceThreshold(c: ConfidenceBreakdown): boolean {
  return c.overall < LEGACY_REFUSE_THRESHOLD;
}

export function missingSignals(c: ConfidenceBreakdown): string[] {
  const missing: string[] = [];
  if (c.market < CONFIDENCE_MEDIUM) missing.push("Market demand");
  if (c.document < CONFIDENCE_MEDIUM) missing.push("Historical appreciation");
  if (c.property < CONFIDENCE_MEDIUM) missing.push("Verified listing comps");
  if (c.builder < CONFIDENCE_MEDIUM) missing.push("Builder delivery track record");
  if (c.location < CONFIDENCE_MEDIUM) missing.push("Locality-level analytics");
  if (c.market < 55) missing.push("Rental yield benchmarks");
  return [...new Set(missing)].slice(0, 5);
}

export function knownSignals(
  classification: IntentClassification,
  c: ConfidenceBreakdown,
): string[] {
  const known: string[] = [];
  const place =
    classification.location ||
    classification.entities.locality ||
    classification.entities.city;
  if (place && c.location >= 50) {
    known.push(`You're asking about **${place}** in the Tricity market.`);
  }
  if (classification.builder && c.builder >= 50) {
    known.push(`Builder focus: **${classification.builder}**.`);
  }
  if (classification.budget) {
    const lakhs = Math.round(classification.budget / 100_000);
    known.push(`Budget signal on file: about **₹${lakhs} lakh**.`);
  }
  if (classification.bedrooms) {
    known.push(`Configuration focus: **${classification.bedrooms} BHK**.`);
  }
  if (classification.compareTargets.length >= 2) {
    known.push(
      `Comparison targets: **${classification.compareTargets.slice(0, 3).join(" vs ")}**.`,
    );
  }
  if (known.length === 0) {
    known.push(
      "I can work from Tricity geography (Chandigarh, Mohali, Panchkula, Zirakpur, Dhakoli, Peer Muchalla, Kharar, New Chandigarh, Aerocity) without inventing project-level numbers.",
    );
  }
  return known;
}

export function nextActionsForIntent(
  classification: IntentClassification,
): string[] {
  const place =
    classification.location ||
    classification.entities.locality ||
    classification.entities.city ||
    "Mohali";
  const bhk = classification.bedrooms ?? 3;
  const budgetLakhs = classification.budget
    ? Math.round(classification.budget / 100_000)
    : 80;

  switch (classification.intent) {
    case "LOCALITY":
    case "MARKET_TREND":
      return [
        `Compare Aerocity vs Sector 70`,
        `Show projects below market in ${place}`,
        `Find undervalued builders in ${place}`,
        `Compare rental yields in ${place}`,
        `Best investment under ₹${budgetLakhs} lakh`,
      ];
    case "INVESTMENT":
      return [
        `Best investment under ₹${budgetLakhs} lakh`,
        `Compare rental yields in ${place}`,
        `Compare appreciation: Zirakpur vs New Chandigarh`,
        `${bhk} BHK under ₹${budgetLakhs} lakh in ${place}`,
        "Find undervalued builders",
      ];
    case "BUILDER":
      return [
        classification.builder
          ? `Show projects by ${classification.builder}`
          : "Show trusted builders in Mohali",
        "Compare similar builders",
        `Best ${bhk} BHK by verified builders`,
        "Builders with strong legal verification",
      ];
    case "COMPARE":
      return [
        classification.compareTargets.length >= 2
          ? `Show properties in ${classification.compareTargets[0]}`
          : "Compare Aerocity vs New Chandigarh",
        "Compare rental yields",
        "Compare appreciation potential",
        `${bhk} BHK under ₹${budgetLakhs} lakh`,
      ];
    case "PROPERTY_SEARCH":
      return [
        `${bhk} BHK under ₹${budgetLakhs} lakh in ${place}`,
        "Show ready to move options",
        "Higher rental yield",
        "Compare these areas",
      ];
    case "PROPERTY_ANALYSIS":
      return [
        "Compare with nearby projects",
        "Calculate EMI",
        "Show similar properties",
        "Explain investment risk",
      ];
    case "FINANCE":
      return [
        "Calculate EMI for 80 lakh",
        `${bhk} BHK under ₹${budgetLakhs} lakh`,
        "Best investment under 1 crore",
      ];
    default:
      return [
        "3 BHK under 80 lakh in Mohali",
        "Compare Zirakpur vs New Chandigarh",
        "Tell me about Aerocity",
        "Where should I invest 80 lakh?",
      ];
  }
}

/**
 * Phase 1 (verified) + Phase 2 (continue) — never a dead end.
 */
export function buildPartialIntelligenceAnswer(
  classification: IntentClassification,
  c: ConfidenceBreakdown,
  opts?: { emptySearch?: boolean },
): string {
  const place =
    classification.location ||
    classification.entities.locality ||
    classification.entities.city;
  const known = knownSignals(classification, c);
  const missing = missingSignals(c);
  const actions = nextActionsForIntent(classification);
  const band = confidenceBand(c.overall);

  const phase1Header =
    band === "low"
      ? "### Verified Information"
      : "### What I can confirm";

  let phase1Body: string;
  if (opts?.emptySearch) {
    phase1Body = place
      ? `I couldn't find an exact property inside **${place}** today. However, I keep searching nearby verified corridors and micro-markets that buyers in ${place} usually consider. Tell me your budget and BHK and I'll narrow the closest matches — I won't invent projects to fill the gap.`
      : `I couldn't find an exact match for those filters today. Share a locality, budget, or BHK and I'll surface nearby verified options that closely match your requirement — I won't invent projects.`;
  } else if (place && (classification.intent === "LOCALITY" || classification.intent === "MARKET_TREND")) {
    phase1Body = [
      `Current verified data does **not** allow me to conclude whether **${place} as a whole** is overpriced or a blanket “buy”.`,
      `City-wide pricing needs denser comps, rental benchmarks, and appreciation history — some of that is still being collected.`,
      "",
      "**Known so far:**",
      ...known.map((k) => `• ${k}`),
    ].join("\n");
  } else if (classification.intent === "BUILDER") {
    phase1Body = [
      classification.builder
        ? `I don't have a full verified dossier on **${classification.builder}** yet (delivery delays, complaints, and ratings may be incomplete).`
        : "I need a builder name to run a full verification.",
      "",
      "**Known so far:**",
      ...known.map((k) => `• ${k}`),
    ].join("\n");
  } else {
    phase1Body = [
      "I can share only what is verified — I won't invent market percentages or project claims.",
      "",
      "**Known so far:**",
      ...known.map((k) => `• ${k}`),
    ].join("\n");
  }

  const stillCollecting =
    missing.length > 0
      ? [
          "",
          "### Still Collecting",
          ...missing.map((m) => `• ${m}`),
        ].join("\n")
      : "";

  const phase2 = [
    "",
    "### I can still help you",
    "However I can still help you move forward. I can:",
    ...actions.slice(0, 6).map((a) => `• ${a}`),
    "",
    "What would you like me to compare next?",
  ].join("\n");

  return [
    "I'm AreaIQ, your AI Real Estate Advisor.",
    "",
    phase1Header,
    "",
    phase1Body,
    stillCollecting,
    phase2,
  ]
    .filter(Boolean)
    .join("\n");
}

/** @deprecated Use buildPartialIntelligenceAnswer — kept so old imports don't break */
export function buildLowConfidenceAnswer(c: ConfidenceBreakdown): string {
  return buildPartialIntelligenceAnswer(
    {
      intent: "UNKNOWN",
      confidence: c.overall / 100,
      entities: {
        bhk: null,
        minPriceLakhs: null,
        maxPriceLakhs: null,
        maxPriceCrore: null,
        city: null,
        locality: null,
        propertyType: null,
        listingType: null,
        builder: null,
        localityTopic: null,
        propertyName: null,
        investmentFocus: null,
        compareTargets: [],
      },
      location: null,
      builder: null,
      budget: null,
      bedrooms: null,
      propertyName: null,
      compareTargets: [],
      investmentPurpose: null,
      reasoning: "",
    },
    c,
  );
}

export function partialIntelligenceResponse(
  ctx: Pick<HandlerContext, "classification">,
  confidence: ConfidenceBreakdown,
  opts?: { emptySearch?: boolean },
): AskEngineResponse {
  const actions = nextActionsForIntent(ctx.classification);
  const missing = missingSignals(confidence);

  return {
    intent: ctx.classification.intent,
    answer: buildPartialIntelligenceAnswer(ctx.classification, confidence, opts),
    ...classificationToResponseFields(ctx.classification),
    properties: [],
    propertyRationales: {},
    suggestions: actions.slice(0, 5),
    followUpQuestions: actions.slice(0, 5),
    stats: null,
    searchedDatabase: Boolean(opts?.emptySearch),
    isSimilar: false,
    intelligenceLevel: "partial",
    confidenceOverall: confidence.overall,
    missingSignals: missing,
  };
}

/** @deprecated Alias — never a dead-end refuse */
export function lowConfidenceResponse(
  ctx: Pick<HandlerContext, "classification">,
  confidence: ConfidenceBreakdown,
): AskEngineResponse {
  return partialIntelligenceResponse(ctx, confidence);
}

/** Intents that benefit from verified listing / locality anchors. */
export function intentRequiresStrongEvidence(intent: IntentClassification["intent"]): boolean {
  return (
    intent === "PROPERTY_SEARCH" ||
    intent === "PROPERTY_ANALYSIS" ||
    intent === "COMPARE" ||
    intent === "BUILDER" ||
    intent === "INVESTMENT" ||
    intent === "MARKET_TREND" ||
    intent === "LOCALITY" ||
    intent === "FINANCE"
  );
}

export function intelligenceLevelForConfidence(overall: number): IntelligenceLevel {
  return overall >= CONFIDENCE_MEDIUM ? "full" : "partial";
}
