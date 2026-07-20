import { extractPropertyRationales } from "../../markdown";
import { detectConversationLanguage } from "../../language";
import { completeText } from "../../engine/openai";
import { formatAreaForComposer } from "../area/service";
import { formatBuilderForComposer } from "../builder/service";
import { formatInvestmentForComposer } from "../investment/service";
import type { ComposedAnswer, IntelligenceBundle, RankedListing } from "../types";
import { ANSWER_COMPOSER_SYSTEM, buildComposerUserPayload } from "./prompts";

function formatPrice(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
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
  });

  let markdown: string;
  try {
    markdown = await completeText(ANSWER_COMPOSER_SYSTEM, userPayload, {
      history,
      maxTokens: 550,
      temperature: 0.55,
    });
  } catch {
    markdown = buildDeterministicFallback(bundle, responseLanguage);
  }

  markdown = markdown.trim();

  // Safety: ensure no-exact-match is stated without adding a second Summary section
  if (bundle.search.noExactMatch && !/no exact match|exact match (nahi|nahin)|bilkul match/i.test(markdown)) {
    const preamble =
      responseLanguage === "hindi"
        ? "Exact match available nahi hai."
        : responseLanguage === "hinglish"
          ? "Exact match nahi mila."
          : "I couldn't find an exact match, but these verified alternatives are worth considering.";
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
  };
}

function buildDeterministicFallback(
  bundle: IntelligenceBundle,
  language: import("../../language").ResponseLanguage,
): string {
  const rows = bundle.search.noExactMatch
    ? bundle.search.alternatives
    : bundle.search.exact;
  const top = rows[0]?.listing;

  if (language === "hindi") {
    if (bundle.search.noExactMatch) {
      return top
        ? `Exact match उपलब्ध नहीं है, लेकिन verified विकल्प हैं। ${top.name} (${top.bhk} BHK, ${formatPrice(top.price)}, ${top.city}) देखने लायक है। नीचे cards में details हैं — budget या locality adjust करनी है?`
        : `Exact match उपलब्ध नहीं है, और इस filter पर verified listing भी नहीं मिली। Budget, BHK, या locality थोड़ी flexible कर सकते हैं?`;
    }
    return top
      ? `मैंने verified विकल्प निकाले हैं। ${top.name} अच्छा fit लगता है — ${top.bhk} BHK, ${formatPrice(top.price)}, ${top.city}। नीचे cards में details हैं। किस पर focus करें — price, rental, या ready-to-move?`
      : `इस filter पर अभी कोई verified listing नहीं मिली। Budget, BHK, या area adjust करके फिर try करें?`;
  }

  if (language === "hinglish") {
    if (bundle.search.noExactMatch) {
      return top
        ? `Exact match nahi mila, but yeh verified alternatives worth considering hain. ${top.name} (${top.bhk} BHK, ${formatPrice(top.price)}, ${top.city}) ek solid option lagta hai. Cards mein details hain — budget ya locality thodi adjust karein?`
        : `Exact match nahi mila, aur is filter pe verified listing bhi nahi hai. Budget, BHK, ya locality flexible kar sakte ho?`;
    }
    return top
      ? `Maine kuch verified options find kiye. ${top.name} achha fit lag raha hai — ${top.bhk} BHK, ${formatPrice(top.price)}, ${top.city}. Neeche cards mein details hain. Price pe focus karna hai, rental pe, ya ready-to-move?`
      : `Is filter pe abhi koi verified listing nahi mili. Budget, BHK, ya area adjust karke try karein?`;
  }

  if (bundle.search.noExactMatch) {
    return top
      ? `I couldn't find an exact match, but these verified alternatives are worth considering. ${top.name} (${top.bhk} BHK, ${formatPrice(top.price)}, ${top.city}) looks like a solid option — details are in the cards below. Want to adjust budget or locality?`
      : `I couldn't find an exact match, and there are no verified listings for this filter yet. Can we loosen budget, BHK, or locality?`;
  }

  return top
    ? `Here's what I'd recommend from the verified options. ${top.name} looks like a good fit — ${top.bhk} BHK at ${formatPrice(top.price)} in ${top.city}. Property cards below have the details. Want to focus on price, rental yield, or ready-to-move?`
    : `I couldn't find verified listings for this filter yet. Shall we adjust budget, BHK, or area?`;
}
