/**
 * Multi-unit pricing + plot size range helpers for AreaIQ listings.
 * Never show ₹0 or concatenated plot sizes (e.g. 100150).
 */

import type { PropertyStructuredMeta } from "./nearbyPlacesMeta";

export type PlotSizeUnit = "Sq Ft" | "Sq Yard" | "Acre" | "";

export type PricingUnit = "sqft" | "sqyd" | "acre" | "total";

export interface ParsedPlotSize {
  min: number | null;
  max: number | null;
  unit: PlotSizeUnit;
  /** Display: "100–150 Sq Yard" or "100 Sq Yard" */
  label: string;
}

export interface NormalizedPricing {
  totalPrice: number | null;
  pricePerSqft: number | null;
  pricePerSqyd: number | null;
  pricePerAcre: number | null;
  currency: string;
  minPlotSize: number | null;
  maxPlotSize: number | null;
  plotSizeUnit: PlotSizeUnit;
  plotSizeLabel: string;
  /** Estimated from rate × min plot — does not overwrite totalPrice */
  estimatedStartingPrice: number | null;
  estimatedStartingLabel: string | null;
  /** Primary headline for buyer UI */
  primaryPriceLabel: string;
  /** Secondary rate line (only if distinct from primary) */
  rateLabel: string | null;
  sizeLabel: string | null;
  /** Preferred unit for this property type */
  preferredUnit: PricingUnit;
}

function parseNumber(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 ? raw : null;
  const cleaned = String(raw).replace(/,/g, "").trim();
  if (!cleaned) return null;
  // Strip unit suffixes for numeric parse
  const m = cleaned.match(/([\d.]+)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function formatInrAmount(price: number): string {
  if (price >= 10_000_000) {
    const cr = price / 10_000_000;
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2).replace(/\.?0+$/, "")} Cr`;
  }
  if (price >= 100_000) {
    const lakhs = price / 100_000;
    return `₹${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(2).replace(/\.?0+$/, "")} Lakhs`;
  }
  return `₹${Math.round(price).toLocaleString("en-IN")}`;
}

/** Format compact L/Cr for “Starting From”. */
export function formatStartingFrom(price: number): string {
  if (price >= 10_000_000) {
    const cr = price / 10_000_000;
    const label = cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2).replace(/\.?0+$/, "");
    return `Starting From ₹${label} Cr`;
  }
  if (price >= 100_000) {
    const lakhs = price / 100_000;
    const label = lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1).replace(/\.0$/, "");
    return `Starting From ₹${label} Lakhs`;
  }
  return `Starting From ${formatInrAmount(price)}`;
}

function normalizeUnit(raw: string | undefined | null): PlotSizeUnit {
  if (!raw) return "";
  const v = raw.toLowerCase();
  if (/acre|kanal/.test(v)) return "Acre";
  if (/yd|yard/.test(v)) return "Sq Yard";
  if (/ft|feet|sqft|sq\.?\s*ft/.test(v)) return "Sq Ft";
  return "";
}

/**
 * Parse plot size ranges. Never concatenate digits across a range.
 * "100 to 150 Sq Yard" → min 100, max 150, unit Sq Yard
 * "100-150" → min 100, max 150
 * "100150" with meta hint from "100-150" is fixed by preferring the text range
 */
export function parsePlotSizeRange(
  raw: string | undefined | null,
  unitHint?: string | null,
): ParsedPlotSize {
  const empty: ParsedPlotSize = { min: null, max: null, unit: "", label: "" };
  if (!raw?.trim()) return empty;

  const text = raw.trim();
  const unit = normalizeUnit(unitHint) || normalizeUnit(text) || "";

  // Explicit range: 100 to 150 | 100-150 | 100 – 150 | 100x150 (treat x as range for plots)
  const range = text.match(
    /(\d+(?:\.\d+)?)\s*(?:to|–|—|-|x|×)\s*(\d+(?:\.\d+)?)/i,
  );
  if (range) {
    const a = parseFloat(range[1]);
    const b = parseFloat(range[2]);
    if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) {
      const min = Math.min(a, b);
      const max = Math.max(a, b);
      const label = min === max
        ? `${formatNum(min)}${unit ? ` ${unit}` : ""}`
        : `${formatNum(min)}–${formatNum(max)}${unit ? ` ${unit}` : ""}`;
      return { min, max, unit, label: label.trim() };
    }
  }

  // Single size
  const single = text.match(/(\d+(?:\.\d+)?)/);
  if (single) {
    const min = parseFloat(single[1]);
    if (Number.isFinite(min) && min > 0) {
      // Guard: concatenated range artifact (e.g. 100150 from "100-150")
      if (looksLikeConcatenatedRange(min) && !range) {
        const split = splitConcatenatedRange(min);
        if (split) {
          const label = `${formatNum(split.min)}–${formatNum(split.max)}${unit ? ` ${unit}` : ""}`;
          return { min: split.min, max: split.max, unit, label: label.trim() };
        }
      }
      return {
        min,
        max: null,
        unit,
        label: `${formatNum(min)}${unit ? ` ${unit}` : ""}`.trim(),
      };
    }
  }

  return empty;
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n);
}

/** Heuristic: 100150 from 100-150, 50100 from 50-100, etc. */
function looksLikeConcatenatedRange(n: number): boolean {
  if (!Number.isInteger(n) || n < 1000) return false;
  const s = String(n);
  return s.length >= 5 && s.length <= 8;
}

function splitConcatenatedRange(n: number): { min: number; max: number } | null {
  const s = String(Math.trunc(n));
  // Try even split first (100150 → 100|150)
  if (s.length % 2 === 0) {
    const mid = s.length / 2;
    const a = parseInt(s.slice(0, mid), 10);
    const b = parseInt(s.slice(mid), 10);
    if (a > 0 && b > a && b < a * 5) return { min: a, max: b };
  }
  // Try 3+3 for 6-digit
  if (s.length === 6) {
    const a = parseInt(s.slice(0, 3), 10);
    const b = parseInt(s.slice(3), 10);
    if (a > 0 && b > a && b < a * 5) return { min: a, max: b };
  }
  return null;
}

function detectPreferredUnit(
  subType: string | undefined | null,
  propertyTypeLabel: string | undefined | null,
  pricing: Pick<NormalizedPricing, "pricePerSqyd" | "pricePerSqft" | "pricePerAcre" | "totalPrice">,
): PricingUnit {
  const t = `${subType || ""} ${propertyTypeLabel || ""}`.toLowerCase();
  if (/agricultur|farm|acre/.test(t) || pricing.pricePerAcre) return "acre";
  if (/plot/.test(t) || pricing.pricePerSqyd) return "sqyd";
  if (/villa|house|kothi|bungalow/.test(t) && pricing.totalPrice && !pricing.pricePerSqft) {
    return "total";
  }
  if (pricing.pricePerSqft) return "sqft";
  if (pricing.totalPrice) return "total";
  if (pricing.pricePerSqyd) return "sqyd";
  if (pricing.pricePerAcre) return "acre";
  return "total";
}

function rateLabelFor(
  unit: PricingUnit,
  pricing: Pick<NormalizedPricing, "pricePerSqft" | "pricePerSqyd" | "pricePerAcre" | "totalPrice">,
): string | null {
  if (unit === "sqyd" && pricing.pricePerSqyd) {
    return `₹${Math.round(pricing.pricePerSqyd).toLocaleString("en-IN")} / Sq Yard`;
  }
  if (unit === "sqft" && pricing.pricePerSqft) {
    return `₹${Math.round(pricing.pricePerSqft).toLocaleString("en-IN")} / Sq Ft`;
  }
  if (unit === "acre" && pricing.pricePerAcre) {
    return `${formatInrAmount(pricing.pricePerAcre)} / Acre`;
  }
  if (unit === "total" && pricing.totalPrice) {
    return formatInrAmount(pricing.totalPrice);
  }
  return null;
}

/**
 * Pull rate from legacy "92000 /sq yd" strings stuffed into pricePerSqft.
 */
export function parseLegacyRateString(raw: string | undefined | null): {
  pricePerSqft: number | null;
  pricePerSqyd: number | null;
  pricePerAcre: number | null;
} {
  if (!raw?.trim()) {
    return { pricePerSqft: null, pricePerSqyd: null, pricePerAcre: null };
  }
  const text = raw.trim();
  const num = parseNumber(text);
  if (!num) return { pricePerSqft: null, pricePerSqyd: null, pricePerAcre: null };

  if (/yd|yard/i.test(text)) {
    return { pricePerSqft: null, pricePerSqyd: num, pricePerAcre: null };
  }
  if (/acre/i.test(text)) {
    return { pricePerSqft: null, pricePerSqyd: null, pricePerAcre: num };
  }
  if (/ft|sqft|sq\.?\s*ft/i.test(text)) {
    return { pricePerSqft: num, pricePerSqyd: null, pricePerAcre: null };
  }
  // Bare number in pricePerSqft field → treat as sqft
  return { pricePerSqft: num, pricePerSqyd: null, pricePerAcre: null };
}

export interface PricingInput {
  dbPrice?: number | null;
  dbAreaSqft?: number | null;
  subType?: string | null;
  propertyTypeLabel?: string | null;
  meta?: PropertyStructuredMeta | null;
  /** From import knowledge structured fields */
  structuredFields?: Record<string, string | string[]> | null;
}

/**
 * Normalize pricing + plot sizes from DB row + meta (including legacy AI imports).
 */
export function normalizePricing(input: PricingInput): NormalizedPricing {
  const meta = input.meta;
  const sf = input.structuredFields || meta?.importKnowledge?.structuredFields || {};
  const getSf = (key: string) => {
    const v = sf[key];
    return typeof v === "string" ? v : "";
  };

  const legacyRate = parseLegacyRateString(meta?.pricing.pricePerSqft);

  let pricePerSqft =
    parseNumber(meta?.pricing.pricePerSqft && !/yd|yard|acre/i.test(meta.pricing.pricePerSqft)
      ? meta.pricing.pricePerSqft
      : null) ||
    parseNumber(getSf("pricePerSqFt")) ||
    legacyRate.pricePerSqft;

  let pricePerSqyd =
    parseNumber((meta?.pricing as { pricePerSqyd?: string } | undefined)?.pricePerSqyd) ||
    parseNumber(getSf("pricePerYard")) ||
    parseNumber(getSf("pricePerSqyd")) ||
    legacyRate.pricePerSqyd;

  let pricePerAcre =
    parseNumber((meta?.pricing as { pricePerAcre?: string } | undefined)?.pricePerAcre) ||
    parseNumber(getSf("pricePerAcre")) ||
    legacyRate.pricePerAcre;

  let totalPrice =
    parseNumber((meta?.pricing as { totalPrice?: string } | undefined)?.totalPrice) ||
    parseNumber(meta?.pricing.currentPrice) ||
    parseNumber(input.dbPrice);

  // Plot sizes from dedicated fields or legacy plotArea / structured
  const minFromMeta = parseNumber(
    (meta?.specs as { minPlotSize?: string } | undefined)?.minPlotSize || getSf("minPlotSize"),
  );
  const maxFromMeta = parseNumber(
    (meta?.specs as { maxPlotSize?: string } | undefined)?.maxPlotSize || getSf("maxPlotSize"),
  );
  const unitFromMeta = normalizeUnit(
    (meta?.specs as { plotSizeUnit?: string } | undefined)?.plotSizeUnit ||
      getSf("plotSizeUnit") ||
      "",
  );

  const plotRaw =
    getSf("plotSizes") ||
    meta?.specs.plotArea ||
    (minFromMeta ? `${minFromMeta}${maxFromMeta ? `-${maxFromMeta}` : ""}` : "") ||
    "";

  let plot = parsePlotSizeRange(plotRaw, unitFromMeta || getSf("plotSizes"));

  // If area_sqft looks like concatenated range and we have no plot parse, try DB area
  if (!plot.min && input.dbAreaSqft && looksLikeConcatenatedRange(input.dbAreaSqft)) {
    const split = splitConcatenatedRange(input.dbAreaSqft);
    if (split) {
      plot = {
        min: split.min,
        max: split.max,
        unit: unitFromMeta || "Sq Yard",
        label: `${split.min}–${split.max} ${unitFromMeta || "Sq Yard"}`,
      };
    }
  }

  if (minFromMeta && !plot.min) {
    plot = {
      min: minFromMeta,
      max: maxFromMeta,
      unit: unitFromMeta || plot.unit || "Sq Yard",
      label: maxFromMeta
        ? `${formatNum(minFromMeta)}–${formatNum(maxFromMeta)}${unitFromMeta ? ` ${unitFromMeta}` : ""}`
        : `${formatNum(minFromMeta)}${unitFromMeta ? ` ${unitFromMeta}` : ""}`,
    };
  }

  // Prefer explicit unit from meta
  if (unitFromMeta && plot.min) {
    plot = {
      ...plot,
      unit: unitFromMeta,
      label: plot.max
        ? `${formatNum(plot.min)}–${formatNum(plot.max)} ${unitFromMeta}`
        : `${formatNum(plot.min)} ${unitFromMeta}`,
    };
  }

  // Infer sq yd for plots when rate is per yard
  const sub = `${input.subType || ""} ${input.propertyTypeLabel || ""}`.toLowerCase();
  if (/plot/.test(sub) && pricePerSqyd && !plot.unit) {
    plot = {
      ...plot,
      unit: "Sq Yard",
      label: plot.min
        ? plot.max
          ? `${formatNum(plot.min)}–${formatNum(plot.max)} Sq Yard`
          : `${formatNum(plot.min)} Sq Yard`
        : plot.label,
    };
  }

  // Estimated starting price: rate × min plot (do not overwrite total)
  let estimatedStartingPrice: number | null = null;
  let estimatedStartingLabel: string | null = null;
  if (!totalPrice && plot.min) {
    if (pricePerSqyd && (plot.unit === "Sq Yard" || /plot/.test(sub))) {
      estimatedStartingPrice = pricePerSqyd * plot.min;
      estimatedStartingLabel = formatStartingFrom(estimatedStartingPrice);
    } else if (pricePerSqft && (plot.unit === "Sq Ft" || !plot.unit)) {
      estimatedStartingPrice = pricePerSqft * plot.min;
      estimatedStartingLabel = formatStartingFrom(estimatedStartingPrice);
    } else if (pricePerAcre && plot.unit === "Acre") {
      estimatedStartingPrice = pricePerAcre * plot.min;
      estimatedStartingLabel = formatStartingFrom(estimatedStartingPrice);
    }
  }

  const preferredUnit = detectPreferredUnit(input.subType, input.propertyTypeLabel, {
    pricePerSqft,
    pricePerSqyd,
    pricePerAcre,
    totalPrice,
  });

  // For plots, never derive fake PPSF from price/area when we have per-yard
  if (/plot/.test(sub) && pricePerSqyd) {
    // keep pricePerSqft only if explicitly set as sqft rate
  } else if (!pricePerSqft && totalPrice && input.dbAreaSqft && input.dbAreaSqft > 0) {
    if (!looksLikeConcatenatedRange(input.dbAreaSqft)) {
      pricePerSqft = Math.round(totalPrice / input.dbAreaSqft);
    }
  }

  const rateLabel = rateLabelFor(preferredUnit, {
    pricePerSqft,
    pricePerSqyd,
    pricePerAcre,
    totalPrice,
  });

  let primaryPriceLabel = "Price on Request";
  if (preferredUnit === "total" && totalPrice) {
    primaryPriceLabel = formatInrAmount(totalPrice);
  } else if (preferredUnit === "sqyd" && pricePerSqyd) {
    primaryPriceLabel = `₹${Math.round(pricePerSqyd).toLocaleString("en-IN")} / Sq Yard`;
  } else if (preferredUnit === "sqft" && pricePerSqft) {
    primaryPriceLabel = `₹${Math.round(pricePerSqft).toLocaleString("en-IN")} / Sq Ft`;
  } else if (preferredUnit === "acre" && pricePerAcre) {
    primaryPriceLabel = `${formatInrAmount(pricePerAcre)} / Acre`;
  } else if (totalPrice) {
    primaryPriceLabel = formatInrAmount(totalPrice);
  } else if (estimatedStartingLabel) {
    primaryPriceLabel = estimatedStartingLabel;
  } else if (rateLabel) {
    primaryPriceLabel = rateLabel;
  }

  // Secondary rate line when primary is total or starting-from
  let secondaryRate: string | null = null;
  if (
    (preferredUnit === "total" || primaryPriceLabel.startsWith("Starting From")) &&
    rateLabel &&
    rateLabel !== primaryPriceLabel
  ) {
    secondaryRate = rateLabel;
  } else if (preferredUnit !== "total" && totalPrice) {
    secondaryRate = formatInrAmount(totalPrice);
  } else if (
    preferredUnit === "sqyd" &&
    estimatedStartingLabel &&
    primaryPriceLabel !== estimatedStartingLabel
  ) {
    secondaryRate = estimatedStartingLabel;
  }

  return {
    totalPrice,
    pricePerSqft,
    pricePerSqyd,
    pricePerAcre,
    currency: "INR",
    minPlotSize: plot.min,
    maxPlotSize: plot.max,
    plotSizeUnit: plot.unit,
    plotSizeLabel: plot.label,
    estimatedStartingPrice,
    estimatedStartingLabel,
    primaryPriceLabel,
    rateLabel: secondaryRate,
    sizeLabel: plot.label || null,
    preferredUnit,
  };
}

/** Apply normalized fields onto meta for persistence (legacy upgrade). */
export function applyNormalizedPricingToMeta(
  meta: PropertyStructuredMeta,
  normalized: NormalizedPricing,
): PropertyStructuredMeta {
  return {
    ...meta,
    pricing: {
      ...meta.pricing,
      totalPrice: normalized.totalPrice != null ? String(normalized.totalPrice) : meta.pricing.currentPrice || "",
      currentPrice:
        normalized.totalPrice != null
          ? String(normalized.totalPrice)
          : meta.pricing.currentPrice,
      pricePerSqft:
        normalized.pricePerSqft != null ? String(normalized.pricePerSqft) : "",
      pricePerSqyd:
        normalized.pricePerSqyd != null ? String(normalized.pricePerSqyd) : "",
      pricePerAcre:
        normalized.pricePerAcre != null ? String(normalized.pricePerAcre) : "",
    } as PropertyStructuredMeta["pricing"],
    specs: {
      ...meta.specs,
      minPlotSize: normalized.minPlotSize != null ? String(normalized.minPlotSize) : "",
      maxPlotSize: normalized.maxPlotSize != null ? String(normalized.maxPlotSize) : "",
      plotSizeUnit: normalized.plotSizeUnit || "",
      plotArea: normalized.plotSizeLabel || meta.specs.plotArea,
    } as PropertyStructuredMeta["specs"],
  };
}

/**
 * Extract plot range from marketing text for AI import.
 * "100 to 150 Sq Yard" → never a single concatenated number.
 */
export function extractPlotSizeFromText(text: string): {
  plotSizes: string;
  minPlotSize: string;
  maxPlotSize: string;
  plotSizeUnit: string;
} {
  const empty = { plotSizes: "", minPlotSize: "", maxPlotSize: "", plotSizeUnit: "" };
  if (!text.trim()) return empty;

  const m = text.match(
    /(?:plot\s*size|plots?|size)?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:to|–|—|-|x|×)\s*(\d+(?:\.\d+)?)\s*(sq\.?\s*(?:yd|yds|yards|ft|feet)|yards?|acre)?/i,
  );
  if (m) {
    const min = m[1];
    const max = m[2];
    const unit = normalizeUnit(m[3] || "") || "Sq Yard";
    return {
      plotSizes: `${min}–${max} ${unit}`,
      minPlotSize: min,
      maxPlotSize: max,
      plotSizeUnit: unit,
    };
  }

  const single = text.match(
    /(?:plot\s*size|plots?)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(sq\.?\s*(?:yd|yds|yards|ft|feet)|yards?|acre)?/i,
  );
  if (single) {
    const unit = normalizeUnit(single[2] || "") || "";
    return {
      plotSizes: unit ? `${single[1]} ${unit}` : single[1],
      minPlotSize: single[1],
      maxPlotSize: "",
      plotSizeUnit: unit,
    };
  }

  // Bare "100 to 150 Sq Yard" without "plot" keyword
  const bare = text.match(
    /(\d+(?:\.\d+)?)\s*(?:to|–|—|-)\s*(\d+(?:\.\d+)?)\s*(sq\.?\s*(?:yd|yds|yards|ft|feet)|yards?)/i,
  );
  if (bare) {
    const unit = normalizeUnit(bare[3]) || "Sq Yard";
    return {
      plotSizes: `${bare[1]}–${bare[2]} ${unit}`,
      minPlotSize: bare[1],
      maxPlotSize: bare[2],
      plotSizeUnit: unit,
    };
  }

  return empty;
}
