/**
 * Deterministic answer text from live AreaIQ bundles (no LLM).
 */

import { formatInrAmount } from "@/lib/properties/pricingDisplay";
import type { ResponseLanguage } from "../language";
import { computeSearchStats } from "../responses";
import type { IntelligenceBundle, RankedListing } from "../intelligence/types";

export type IntelligenceDigest = {
  listingsSearched: number;
  buildersChecked: number;
  marketSignalsAnalyzed: number;
};

function formatPrice(n: number): string {
  return formatInrAmount(n);
}

/** Illustrative EMI from verified price — disclosed assumptions, not market invention. */
function estimateEmi(principal: number): string | null {
  if (!(principal > 0)) return null;
  const annualRate = 0.085;
  const months = 240;
  const r = annualRate / 12;
  const emi =
    (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  if (!Number.isFinite(emi) || emi <= 0) return null;
  return `${formatPrice(Math.round(emi))}/mo (illustrative · 8.5% · 20 yr)`;
}

function displayRows(bundle: IntelligenceBundle): RankedListing[] {
  return bundle.search.noExactMatch
    ? bundle.search.alternatives
    : bundle.search.exact;
}

export function intelligenceDigestFromBundle(
  bundle: IntelligenceBundle,
): IntelligenceDigest {
  const rows = displayRows(bundle);
  const builders = new Set(
    rows
      .map((r) => (r.listing.builderName || "").trim())
      .filter((n) => n && n.toLowerCase() !== "unknown"),
  );
  const signals =
    rows.filter(
      (r) => r.listing.growthScore != null || r.listing.rentalYield != null,
    ).length +
    (bundle.area?.source === "database" ? 3 : 0) +
    (bundle.builder?.source === "database" ? 2 : 0) +
    (bundle.investment ? 4 : 0) +
    bundle.sources.length;

  return {
    listingsSearched: Math.max(rows.length, bundle.search.exactCount),
    buildersChecked: Math.max(builders.size, bundle.builder ? 1 : 0),
    marketSignalsAnalyzed: Math.max(signals, rows.length > 0 ? 3 : 0),
  };
}

export function buildRichDataAnswer(
  bundle: IntelligenceBundle,
  language: ResponseLanguage,
): string {
  const rows = displayRows(bundle);
  const listings = rows.map((r) => r.listing);
  const stats = listings.length ? computeSearchStats(listings) : null;
  const top = rows.slice(0, 3);
  const builders = [
    ...new Set(
      listings
        .map((l) => (l.builderName || "").trim())
        .filter((n) => n && n.toLowerCase() !== "unknown"),
    ),
  ].slice(0, 4);
  const nearby = [
    ...new Set(
      listings.map((l) => (l.location || l.city || "").trim()).filter(Boolean),
    ),
  ].slice(0, 5);
  const budget = bundle.intent.budgetMax;
  const emi = top[0] ? estimateEmi(top[0].listing.price) : null;
  const inv = bundle.investment;
  const scored = listings
    .map((l) => l.growthScore)
    .filter((n): n is number => n != null);
  const avgScore =
    scored.length > 0
      ? scored.reduce((a, b) => a + b, 0) / scored.length
      : null;

  if (language === "hindi" || language === "hinglish") {
    const intro =
      language === "hindi"
        ? "Verified AreaIQ inventory से ये नतीजे मिले:"
        : "Verified AreaIQ inventory se yeh results mile:";
    return [
      intro,
      "",
      buildEnglishBody({
        rows,
        top,
        stats,
        builders,
        nearby,
        budget,
        emi,
        inv,
        avgScore,
        bundle,
      }),
    ].join("\n");
  }

  return buildEnglishBody({
    rows,
    top,
    stats,
    builders,
    nearby,
    budget,
    emi,
    inv,
    avgScore,
    bundle,
  });
}

function buildEnglishBody(input: {
  rows: RankedListing[];
  top: RankedListing[];
  stats: ReturnType<typeof computeSearchStats>;
  builders: string[];
  nearby: string[];
  budget: number | null;
  emi: string | null;
  inv: IntelligenceBundle["investment"];
  avgScore: number | null;
  bundle: IntelligenceBundle;
}): string {
  const {
    rows,
    top,
    stats,
    builders,
    nearby,
    budget,
    emi,
    inv,
    avgScore,
    bundle,
  } = input;
  const place =
    bundle.intent.resolvedPlace?.displayName ||
    bundle.intent.locality ||
    bundle.intent.city ||
    null;

  const lines: string[] = [];

  if (rows.length === 0) {
    lines.push(
      place
        ? `I searched verified inventory around ${place}, but nothing matched these filters yet.`
        : `I searched verified AreaIQ inventory, but nothing matched these filters yet.`,
    );
    lines.push(
      "Try adjusting budget, BHK, or locality — or ask me to widen the search.",
    );
    return lines.join("\n");
  }

  if (bundle.search.noExactMatch && place) {
    lines.push(
      `No exact match inside ${place} today — here are nearby verified options from live inventory.`,
    );
  } else {
    lines.push(
      `Found **${rows.length} verified match${rows.length === 1 ? "" : "es"}** from live AreaIQ inventory.`,
    );
  }
  lines.push("");

  lines.push("**Top projects**");
  top.forEach((r, i) => {
    const l = r.listing;
    const score =
      l.growthScore != null ? ` · AreaIQ ${Math.round(l.growthScore)}` : "";
    const why = r.matchReasons.slice(0, 2).join("; ");
    lines.push(
      `${i + 1}. **${l.name}** — ${l.bhk} BHK · ${formatPrice(l.price)} · ${l.location || l.city}${score}`,
    );
    if (why) lines.push(`   ${why}`);
  });
  lines.push("");

  if (stats) {
    lines.push("**Average prices**");
    lines.push(
      `Avg ${formatPrice(stats.avgPrice)} · Best investment score ${Math.round(stats.bestInvestmentScore)}${
        stats.avgRentalYield > 0
          ? ` · Avg yield ${stats.avgRentalYield.toFixed(1)}%`
          : ""
      }`,
    );
    lines.push("");
  }

  if (nearby.length) {
    lines.push("**Nearby locations**");
    lines.push(nearby.join(" · "));
    lines.push("");
  }

  if (builders.length) {
    lines.push("**Builder suggestions**");
    lines.push(builders.join(" · "));
    lines.push("");
  }

  if (budget != null && budget > 0) {
    lines.push("**Budget advice**");
    const under = rows.filter((r) => r.listing.price <= budget).length;
    lines.push(
      `Your budget of ${formatPrice(budget)} covers ${under} of ${rows.length} verified options shown. Stretch 5–10% only if the micro-location or builder track record clearly justifies it.`,
    );
    lines.push("");
  }

  if (emi) {
    lines.push("**EMI estimate**");
    lines.push(`On the top match: ~${emi}`);
    lines.push("");
  }

  if (avgScore != null || inv?.investmentGrade || inv?.expectedRoi != null) {
    lines.push("**Investment score**");
    const parts: string[] = [];
    if (avgScore != null) parts.push(`Avg AreaIQ ${Math.round(avgScore)}/100`);
    if (inv?.investmentGrade) parts.push(`Grade ${inv.investmentGrade}`);
    if (inv?.expectedRoi != null)
      parts.push(`Expected ROI signal ${inv.expectedRoi}`);
    if (inv?.rentalYield != null) parts.push(`Rental yield ${inv.rentalYield}%`);
    lines.push(parts.join(" · "));
    lines.push("");
  }

  if (bundle.area?.overview) {
    lines.push("**Location intelligence**");
    lines.push(bundle.area.overview.slice(0, 280));
    lines.push("");
  }

  lines.push(
    "Property cards below have full verified details. Want me to narrow by BHK, ready-to-move, or builder?",
  );

  return lines.join("\n").trim();
}
