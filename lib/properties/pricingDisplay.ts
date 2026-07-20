/**
 * Multi-unit pricing + plot size range helpers for AreaIQ listings.
 * Never show ₹0 or concatenated plot sizes (e.g. 100150).
 *
 * Single entry point for buyer-facing price: `formatPropertyPrice(property)`.
 */

import {
  emptyPropertyStructuredMeta,
  extractPropertyMeta,
  type PropertyStructuredMeta,
} from "./nearbyPlacesMeta";

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

/**
 * Indian market-value formatter for totals only.
 * 39,00,000 → ₹39 L | 72,50,000 → ₹72.5 L | 1,21,80,000 → ₹1.22 Cr
 * Never use this for unit rates (5800 / sq ft).
 */
export function formatInrAmount(price: number): string {
  if (!price || price <= 0) return "Price on Request";
  if (price >= 10_000_000) {
    const cr = price / 10_000_000;
    const label =
      cr % 1 === 0
        ? cr.toFixed(0)
        : cr.toFixed(2).replace(/\.?0+$/, "");
    return `₹${label} Cr`;
  }
  if (price >= 100_000) {
    const lakhs = price / 100_000;
    const label =
      lakhs % 1 === 0
        ? lakhs.toFixed(0)
        : lakhs.toFixed(1).replace(/\.0$/, "");
    return `₹${label} L`;
  }
  // Sub-lakh totals are unusual for Tricity listings — still format, never show raw rate style
  return `₹${Math.round(price).toLocaleString("en-IN")}`;
}

/** True when a stored "price" is actually a unit rate (e.g. 5800), not market value. */
export function looksLikeUnitRateNotTotal(
  price: number | null | undefined,
  pricePerSqft: number | null | undefined,
  pricePerSqyd: number | null | undefined,
): boolean {
  if (!price || price <= 0) return false;
  if (pricePerSqft && pricePerSqft > 0 && Math.abs(price - pricePerSqft) < 1) return true;
  if (pricePerSqyd && pricePerSqyd > 0 && Math.abs(price - pricePerSqyd) < 1) return true;
  // Unit rates sit well below ₹1L; Tricity property totals rarely do
  if (price < 100_000 && ((pricePerSqft && pricePerSqft > 0) || (pricePerSqyd && pricePerSqyd > 0))) {
    return true;
  }
  return false;
}

/** Compact starting price for plots — e.g. "Starting ₹92 L". */
export function formatStartingFrom(price: number): string {
  if (!price || price <= 0) return "Price on Request";
  if (price >= 10_000_000) {
    const cr = price / 10_000_000;
    const label = cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2).replace(/\.?0+$/, "");
    return `Starting ₹${label} Cr`;
  }
  if (price >= 100_000) {
    const lakhs = price / 100_000;
    const label = lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1).replace(/\.0$/, "");
    return `Starting ₹${label} L`;
  }
  return `Starting ${formatInrAmount(price)}`;
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

  // Reject totals that are clearly unit rates saved into the price column (e.g. 5800)
  // — we'll recalculate from rate × area below.
  // (pricePerSqft / pricePerSqyd may not be final yet; re-check after rates resolve)

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

  // Prefer super area → carpet → built-up → DB area_sqft
  const superArea = parseNumber(
    (meta?.specs as { superArea?: string } | undefined)?.superArea || getSf("superArea"),
  );
  const carpetArea = parseNumber(
    (meta?.specs as { carpetArea?: string } | undefined)?.carpetArea || getSf("carpetArea"),
  );
  const builtUpArea = parseNumber(
    (meta?.specs as { builtUpArea?: string } | undefined)?.builtUpArea || getSf("builtUpArea"),
  );
  const rawArea =
    superArea ||
    carpetArea ||
    builtUpArea ||
    (input.dbAreaSqft &&
    input.dbAreaSqft > 0 &&
    !looksLikeConcatenatedRange(input.dbAreaSqft)
      ? input.dbAreaSqft
      : null);
  const areaSqft = rawArea;

  const isPlot =
    /plot/.test(sub) ||
    Boolean(pricePerSqyd && plot.min) ||
    Boolean(pricePerAcre && plot.min && plot.unit === "Acre");

  if (looksLikeUnitRateNotTotal(totalPrice, pricePerSqft, pricePerSqyd)) {
    totalPrice = null;
  }

  // Auto-calculate total when missing (never leave buyers with ₹0 if rates exist)
  let estimatedStartingPrice: number | null = null;
  let estimatedStartingLabel: string | null = null;

  if (!totalPrice) {
    if (!isPlot && pricePerSqft && areaSqft) {
      // Apartments / villas: price_per_sqft × super/carpet area
      totalPrice = Math.round(pricePerSqft * areaSqft);
    } else if (pricePerSqyd && plot.min && plot.min > 0) {
      // Plots: price_per_sqyard × minimum_plot_size
      estimatedStartingPrice = Math.round(pricePerSqyd * plot.min);
      totalPrice = estimatedStartingPrice;
      estimatedStartingLabel = formatStartingFrom(estimatedStartingPrice);
    } else if (pricePerSqft && plot.min && plot.min > 0) {
      estimatedStartingPrice = Math.round(pricePerSqft * plot.min);
      totalPrice = estimatedStartingPrice;
      estimatedStartingLabel = formatStartingFrom(estimatedStartingPrice);
    } else if (pricePerAcre && plot.min && plot.min > 0) {
      estimatedStartingPrice = Math.round(pricePerAcre * plot.min);
      totalPrice = estimatedStartingPrice;
      estimatedStartingLabel = formatStartingFrom(estimatedStartingPrice);
    }
  } else if (isPlot && plot.min && (pricePerSqyd || pricePerSqft || pricePerAcre)) {
    // Keep starting label for plots even when a total exists
    if (pricePerSqyd) {
      estimatedStartingPrice = Math.round(pricePerSqyd * plot.min);
    } else if (pricePerSqft) {
      estimatedStartingPrice = Math.round(pricePerSqft * plot.min);
    } else if (pricePerAcre) {
      estimatedStartingPrice = Math.round(pricePerAcre * plot.min);
    }
    if (estimatedStartingPrice) {
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
  if (isPlot && pricePerSqyd) {
    // keep pricePerSqft only if explicitly set as sqft rate
  } else if (!pricePerSqft && totalPrice && areaSqft) {
    pricePerSqft = Math.round(totalPrice / areaSqft);
  }

  // Buyer-facing labels
  // Apartments/villas: ₹1.22 Cr · ₹5,800 / sq ft · 2100 sq ft
  // Plots: Starting ₹92 L · ₹92,000 / Sq Yard · 100–150 Sq Yard
  let primaryPriceLabel = "Price on Request";
  let secondaryRate: string | null = null;
  let sizeLabel: string | null = plot.label || null;

  if (isPlot) {
    const start = estimatedStartingPrice ?? totalPrice;
    if (start && start > 0) {
      primaryPriceLabel = estimatedStartingLabel || formatStartingFrom(start);
    } else {
      primaryPriceLabel = "Price on Request";
    }
    if (pricePerSqyd) {
      secondaryRate = `₹${Math.round(pricePerSqyd).toLocaleString("en-IN")} / Sq Yard`;
    } else if (pricePerSqft) {
      secondaryRate = `₹${Math.round(pricePerSqft).toLocaleString("en-IN")} / sq ft`;
    } else if (pricePerAcre) {
      secondaryRate = `${formatInrAmount(pricePerAcre)} / Acre`;
    }
    sizeLabel = plot.label || null;
  } else if (totalPrice && totalPrice > 0) {
    // Flats / villas / commercial — ALWAYS show market value, never unit rate as headline
    primaryPriceLabel = formatInrAmount(totalPrice);
    if (pricePerSqft) {
      secondaryRate = `₹${Math.round(pricePerSqft).toLocaleString("en-IN")} / sq ft`;
    }
    sizeLabel = areaSqft
      ? `${areaSqft.toLocaleString("en-IN")} sq ft`
      : plot.label || null;
  } else {
    // Never promote a bare unit rate to the primary listing price
    primaryPriceLabel = "Price on Request";
    if (pricePerSqft) {
      secondaryRate = `₹${Math.round(pricePerSqft).toLocaleString("en-IN")} / sq ft`;
    } else if (pricePerSqyd) {
      secondaryRate = `₹${Math.round(pricePerSqyd).toLocaleString("en-IN")} / Sq Yard`;
    }
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
    sizeLabel,
    preferredUnit: isPlot ? (pricePerSqyd ? "sqyd" : preferredUnit) : totalPrice ? "total" : preferredUnit,
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

/** Flexible property-like input for the single pricing utility. */
export interface DisplayPriceInput {
  price?: number | null;
  calculated_price?: number | null;
  calculatedPrice?: number | null;
  area?: number | null;
  area_sqft?: number | null;
  super_area?: number | null;
  superArea?: number | null;
  carpet_area?: number | null;
  carpetArea?: number | null;
  price_per_sqft?: number | null;
  pricePerSqft?: number | null;
  pricePerSqFt?: number | null;
  price_per_sqyard?: number | null;
  pricePerSqyd?: number | null;
  pricePerYard?: number | null;
  minimum_plot_size?: number | null;
  minPlotSize?: number | null;
  maxPlotSize?: number | null;
  sub_type?: string | null;
  propertyType?: string | null;
  propertyTypeLabel?: string | null;
  meta?: PropertyStructuredMeta | null;
  nearby_places?: unknown;
  structuredMeta?: PropertyStructuredMeta | null;
  pricingDisplay?: Partial<NormalizedPricing> | null;
}

export interface FormattedPropertyPrice {
  /** Market value headline — ₹1.22 Cr or Starting ₹92 L. Never a bare unit rate. */
  displayPrice: string;
  /** Unit rate for detail pages — ₹5,800 / sq ft or ₹92,000 / Sq Yard */
  unitPrice: string | null;
  /** Plot starting line (same as displayPrice for plots); null for flats */
  startingPrice: string | null;
  /** Numeric total for filters / EMI / sort */
  numericPrice: number;
  sizeLabel: string | null;
  isPlot: boolean;
  pricePerSqft: number | null;
  pricePerSqyd: number | null;
  area: number | null;
  minPlotSize: number | null;
  maxPlotSize: number | null;
  normalized: NormalizedPricing;
}

/** @deprecated Prefer FormattedPropertyPrice / formatPropertyPrice */
export interface DisplayPriceResult {
  price: number;
  calculatedPrice: number;
  pricePerSqft: number | null;
  pricePerSqyd: number | null;
  area: number | null;
  minPlotSize: number | null;
  maxPlotSize: number | null;
  isPlot: boolean;
  hasPrice: boolean;
  primaryLabel: string;
  rateLabel: string | null;
  sizeLabel: string | null;
  normalized: NormalizedPricing;
}

/**
 * Centralized pricing formatter — use on admin, cards, search, compare, seller, detail.
 *
 * Flat / Villa / House / Commercial:
 *   numericPrice = price_per_sqft × super_area (or carpet/area)
 *   displayPrice = "₹1.22 Cr"  (never "₹5,800")
 *   unitPrice    = "₹5,800 / sq ft" (details only)
 *
 * Plot:
 *   numericPrice = price_per_sqyard × minimum_plot_size
 *   displayPrice = "Starting ₹92 L"
 *   unitPrice    = "₹92,000 / Sq Yard"
 */
export function formatPropertyPrice(property: DisplayPriceInput): FormattedPropertyPrice {
  const meta =
    property.meta ??
    property.structuredMeta ??
    extractPropertyMeta(property.nearby_places ?? null);

  const storedCalculated =
    positiveNumber(property.calculated_price) ??
    positiveNumber(property.calculatedPrice);

  const pricePerSqft =
    positiveNumber(property.price_per_sqft) ??
    positiveNumber(property.pricePerSqft) ??
    positiveNumber(property.pricePerSqFt) ??
    positiveNumber(property.pricingDisplay?.pricePerSqft);

  const pricePerSqyd =
    positiveNumber(property.price_per_sqyard) ??
    positiveNumber(property.pricePerSqyd) ??
    positiveNumber(property.pricePerYard) ??
    positiveNumber(property.pricingDisplay?.pricePerSqyd);

  let explicitPrice =
    positiveNumber(property.price) ??
    positiveNumber(property.pricingDisplay?.totalPrice);

  // If DB price is actually the unit rate (common import bug), ignore it
  if (looksLikeUnitRateNotTotal(explicitPrice, pricePerSqft, pricePerSqyd)) {
    explicitPrice = null;
  }
  if (looksLikeUnitRateNotTotal(storedCalculated, pricePerSqft, pricePerSqyd)) {
    // fall through to rate × area
  }

  const area =
    positiveNumber(property.super_area) ??
    positiveNumber(property.superArea) ??
    positiveNumber(property.carpet_area) ??
    positiveNumber(property.carpetArea) ??
    positiveNumber(property.area) ??
    positiveNumber(property.area_sqft) ??
    positiveNumber(meta?.specs?.superArea) ??
    positiveNumber(meta?.specs?.carpetArea) ??
    positiveNumber(meta?.specs?.builtUpArea) ??
    null;

  const minPlotSize =
    positiveNumber(property.minimum_plot_size) ??
    positiveNumber(property.minPlotSize) ??
    positiveNumber(property.pricingDisplay?.minPlotSize);

  const maxPlotSize =
    positiveNumber(property.maxPlotSize) ??
    positiveNumber(property.pricingDisplay?.maxPlotSize);

  const safeStored =
    storedCalculated &&
    !looksLikeUnitRateNotTotal(storedCalculated, pricePerSqft, pricePerSqyd)
      ? storedCalculated
      : null;

  const baseMeta = meta ?? emptyPropertyStructuredMeta();
  const mergedMeta: PropertyStructuredMeta = {
    ...baseMeta,
    pricing: {
      ...baseMeta.pricing,
      ...(pricePerSqft != null ? { pricePerSqft: String(pricePerSqft) } : {}),
      ...(pricePerSqyd != null ? { pricePerSqyd: String(pricePerSqyd) } : {}),
      ...(explicitPrice != null
        ? { totalPrice: String(explicitPrice), currentPrice: String(explicitPrice) }
        : safeStored != null
          ? { totalPrice: String(safeStored), currentPrice: String(safeStored) }
          : {}),
    } as PropertyStructuredMeta["pricing"],
    specs: {
      ...baseMeta.specs,
      ...(area != null && !baseMeta.specs.superArea && !baseMeta.specs.carpetArea
        ? { superArea: String(area) }
        : {}),
      ...(minPlotSize != null ? { minPlotSize: String(minPlotSize) } : {}),
      ...(maxPlotSize != null ? { maxPlotSize: String(maxPlotSize) } : {}),
    } as PropertyStructuredMeta["specs"],
  };

  const subType = property.sub_type ?? property.propertyType ?? null;
  const normalized = normalizePricing({
    dbPrice: explicitPrice ?? safeStored,
    dbAreaSqft: area,
    subType,
    propertyTypeLabel: property.propertyTypeLabel ?? property.propertyType ?? subType,
    meta: mergedMeta,
  });

  const isPlot =
    /plot/i.test(String(subType || "")) ||
    normalized.preferredUnit === "sqyd" ||
    Boolean(normalized.pricePerSqyd && normalized.minPlotSize);

  let numericPrice = 0;
  if (explicitPrice && explicitPrice > 0) {
    numericPrice = explicitPrice;
  } else if (safeStored && safeStored > 0) {
    numericPrice = safeStored;
  } else if (
    !isPlot &&
    normalized.pricePerSqft &&
    normalized.pricePerSqft > 0 &&
    area &&
    area > 0
  ) {
    numericPrice = Math.round(normalized.pricePerSqft * area);
  } else if (
    normalized.pricePerSqyd &&
    normalized.pricePerSqyd > 0 &&
    normalized.minPlotSize &&
    normalized.minPlotSize > 0
  ) {
    numericPrice = Math.round(normalized.pricePerSqyd * normalized.minPlotSize);
  } else if (normalized.totalPrice && normalized.totalPrice > 0) {
    numericPrice = normalized.totalPrice;
  } else if (normalized.estimatedStartingPrice && normalized.estimatedStartingPrice > 0) {
    numericPrice = normalized.estimatedStartingPrice;
  }

  // Guard: never treat a unit-rate-sized number as the displayed market value
  if (looksLikeUnitRateNotTotal(numericPrice, normalized.pricePerSqft, normalized.pricePerSqyd)) {
    if (
      !isPlot &&
      normalized.pricePerSqft &&
      area &&
      area > 0
    ) {
      numericPrice = Math.round(normalized.pricePerSqft * area);
    } else if (normalized.pricePerSqyd && normalized.minPlotSize) {
      numericPrice = Math.round(normalized.pricePerSqyd * normalized.minPlotSize);
    } else {
      numericPrice = 0;
    }
  }

  const hasPrice = numericPrice > 0;

  let displayPrice = "Price on Request";
  let startingPrice: string | null = null;
  let unitPrice: string | null = null;

  if (isPlot) {
    if (hasPrice) {
      displayPrice = formatStartingFrom(numericPrice);
      startingPrice = displayPrice;
    }
    if (normalized.pricePerSqyd) {
      unitPrice = `₹${Math.round(normalized.pricePerSqyd).toLocaleString("en-IN")} / Sq Yard`;
    } else if (normalized.pricePerSqft) {
      unitPrice = `₹${Math.round(normalized.pricePerSqft).toLocaleString("en-IN")} / sq ft`;
    }
  } else if (hasPrice) {
    displayPrice = formatInrAmount(numericPrice);
    if (normalized.pricePerSqft) {
      unitPrice = `₹${Math.round(normalized.pricePerSqft).toLocaleString("en-IN")} / sq ft`;
    }
  }

  const sizeLabel = isPlot
    ? normalized.sizeLabel || normalized.plotSizeLabel || null
    : area
      ? `${area.toLocaleString("en-IN")} sq ft`
      : normalized.sizeLabel;

  const synced: NormalizedPricing = {
    ...normalized,
    totalPrice: hasPrice ? numericPrice : null,
    estimatedStartingPrice: isPlot && hasPrice ? numericPrice : normalized.estimatedStartingPrice,
    estimatedStartingLabel: startingPrice,
    primaryPriceLabel: displayPrice,
    rateLabel: unitPrice,
    sizeLabel,
    preferredUnit: isPlot ? "sqyd" : hasPrice ? "total" : normalized.preferredUnit,
  };

  return {
    displayPrice,
    unitPrice,
    startingPrice,
    numericPrice: hasPrice ? numericPrice : 0,
    sizeLabel,
    isPlot,
    pricePerSqft: synced.pricePerSqft,
    pricePerSqyd: synced.pricePerSqyd,
    area: area ?? synced.minPlotSize,
    minPlotSize: synced.minPlotSize,
    maxPlotSize: synced.maxPlotSize,
    normalized: synced,
  };
}

/**
 * @deprecated Use `formatPropertyPrice` — kept for existing call sites.
 */
export function calculateDisplayPrice(property: DisplayPriceInput): DisplayPriceResult {
  const formatted = formatPropertyPrice(property);
  return {
    price: formatted.numericPrice,
    calculatedPrice: formatted.numericPrice,
    pricePerSqft: formatted.pricePerSqft,
    pricePerSqyd: formatted.pricePerSqyd,
    area: formatted.area,
    minPlotSize: formatted.minPlotSize,
    maxPlotSize: formatted.maxPlotSize,
    isPlot: formatted.isPlot,
    hasPrice: formatted.numericPrice > 0,
    primaryLabel: formatted.displayPrice,
    rateLabel: formatted.unitPrice,
    sizeLabel: formatted.sizeLabel,
    normalized: formatted.normalized,
  };
}

function positiveNumber(raw: unknown): number | null {
  return parseNumber(raw);
}
