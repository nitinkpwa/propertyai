import { extractPropertyRationales } from "../../markdown";
import { detectConversationLanguage } from "../../language";
import { completeText } from "../../engine/openai";
import { buildRichDataAnswer } from "../../engine/dataAnswer";
import { logAsk } from "../../engine/logger";
import { formatAreaForComposer } from "../area/service";
import { formatBuilderForComposer } from "../builder/service";
import { formatInvestmentForComposer } from "../investment/service";
import type { ComposedAnswer, IntelligenceBundle, RankedListing } from "../types";
import { ANSWER_COMPOSER_SYSTEM, buildComposerUserPayload } from "./prompts";
import { formatInrAmount } from "@/lib/properties/pricingDisplay";

function formatPrice(n: number): string {
  return formatInrAmount(n);
}

function formatListingsBlock(rows: RankedListing[], label: string): string {
  if (rows.length === 0) return `${label}: (none)`;
  return [
    `${label}:`,
    ...rows.map((r, i) => {
      const l = r.listing;
      return [
        `${i + 1}. id=${l.id}`,
        `name=${l.name}`,
        `bhk=${l.bhk}`,
        `price=${formatPrice(l.price)}`,
        `city=${l.city}`,
        `location=${l.location}`,
        `type=${l.propertyType}`,
        `builder=${l.builderName}`,
        `area=${l.area} sqft`,
        `yield=${l.rentalYield ?? "n/a"}`,
        `growth=${l.growthScore ?? "n/a"}`,
        `locationMatch=${r.locationMatchScore ?? "n/a"}`,
        `distanceKm=${r.distanceKm ?? "n/a"}`,
        `tier=${r.locationTier ?? "n/a"}`,
        `matchReasons=${r.matchReasons.join("; ") || "n/a"}`,
      ].join(" | ");
    }),
  ].join("\n");
}

const DEFAULT_SUGGESTIONS = [
  "Compare these",
  "Ready to Move",
  "Show investment view",
  "Narrow by locality",
];

const DEFAULT_FOLLOW_UPS = [
  "Show cheaper options",
  "Tell me about the area",
  "Calculate EMI",
  "Show similar builders",
];

/**
 * Answer Composer — LLM receives ONLY structured bundles.
 * Writes one conversational advisor reply; never invents listings.
 */
export async function composeIntelligenceAnswer(
  bundle: IntelligenceBundle,
  history: import("../../types").ConversationMessage[] = [],
): Promise<ComposedAnswer> {
  const displayRows = bundle.search.noExactMatch
    ? bundle.search.alternatives
    : bundle.search.exact;

  const propertiesBlock = bundle.search.noExactMatch
    ? formatListingsBlock(bundle.search.alternatives, "NEARBY ALTERNATIVES (NOT exact matches)")
    : formatListingsBlock(bundle.search.exact, "EXACT MATCHES");

  const responseLanguage = detectConversationLanguage(bundle.userQuery, history);

  const report = bundle.search.locationReport;
  const locationReportBlock = report
    ? [
        `query=${report.query}`,
        `resolved=${report.resolvedPlace?.displayName ?? "n/a"}`,
        `expanded=${report.expandedLocations.slice(0, 14).join(" | ")}`,
        `matchedCount=${report.matchedCount}`,
        ...report.properties.slice(0, 6).map(
          (p, i) =>
            `${i + 1}. ${p.title} @ ${p.locationLabel} | match=${p.matchScore} | distKm=${p.distanceKm ?? "n/a"} | distScore=${p.distanceScore} | final=${p.finalRankingScore} | tier=${p.tier} | why=${p.why.join("; ")}`,
        ),
      ].join("\n")
    : null;

  const userPayload = buildComposerUserPayload({
    userQuery: bundle.userQuery,
    intentJson: JSON.stringify(bundle.intent, null, 2),
    exactCount: bundle.search.exactCount,
    noExactMatch: bundle.search.noExactMatch,
    alternativeReason: bundle.search.alternativeReason,
    propertiesBlock,
    areaBlock: formatAreaForComposer(bundle.area),
    builderBlock: formatBuilderForComposer(bundle.builder),
    investmentBlock: formatInvestmentForComposer(bundle.investment),
    confidenceScore: bundle.confidenceScore,
    sources: bundle.sources,
    responseLanguage,
    locationReportBlock,
  });

  let markdown: string;
  let aiDegraded = false;
  try {
    markdown = await completeText(ANSWER_COMPOSER_SYSTEM, userPayload, {
      history,
      maxTokens: 550,
      temperature: 0.55,
    });
  } catch (error) {
    logAsk({
      event: "composer_ai_fallback",
      level: "warn",
      error: error instanceof Error ? error.message : String(error),
    });
    markdown = buildRichDataAnswer(bundle, responseLanguage);
    aiDegraded = true;
  }

  markdown = markdown.trim();

  // Safety: ensure nearby-match framing when exact locality is empty
  if (
    bundle.search.noExactMatch &&
    displayRows.length > 0 &&
    !/no exact match|exact match (nahi|nahin)|bilkul match|couldn't find an exact|nearby verified/i.test(
      markdown,
    )
  ) {
    const place =
      bundle.intent.resolvedPlace?.displayName ||
      bundle.intent.locality ||
      bundle.intent.city ||
      "your preferred location";
    const preamble =
      responseLanguage === "hindi"
        ? `${place} में exact property नहीं मिली, लेकिन पास के verified options हैं।`
        : responseLanguage === "hinglish"
          ? `${place} mein exact property nahi mili, lekin nearby verified options hain.`
          : `I couldn't find an exact property inside ${place} today. However I found verified projects very close to your preferred location.`;
    markdown = `${preamble} ${markdown}`;
  }

  const byName = extractPropertyRationales(
    markdown,
    displayRows.map((r) => r.listing.name),
  );
  const propertyRationales: Record<string, string> = {};
  for (const row of displayRows) {
    if (byName[row.listing.name]) {
      propertyRationales[row.listing.id] = byName[row.listing.name];
    } else if (row.matchReasons.length) {
      // Short card chip only — avoid repeating the full advisor paragraph
      propertyRationales[row.listing.id] = row.matchReasons.slice(0, 2).join(" · ");
    }
  }

  return {
    markdown,
    propertyRationales,
    suggestions: DEFAULT_SUGGESTIONS,
    followUpQuestions: DEFAULT_FOLLOW_UPS,
    aiDegraded,
  };
}
