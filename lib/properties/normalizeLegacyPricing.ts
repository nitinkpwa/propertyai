/**
 * Upgrade legacy AI-imported property rows into multi-unit pricing + plot range schema.
 */

import {
  applyNormalizedPricingToMeta,
  formatPropertyPrice,
  normalizePricing,
} from "@/lib/properties/pricingDisplay";
import {
  buildNearbyPlacesPayload,
  emptyPropertyStructuredMeta,
  extractNearbyPlacesList,
  extractPropertyMeta,
  type PropertyStructuredMeta,
} from "@/lib/properties/nearbyPlacesMeta";

export interface LegacyPropertyRow {
  id: string;
  price?: number | null;
  area_sqft?: number | null;
  sub_type?: string | null;
  nearby_places?: unknown;
}

export interface NormalizeResult {
  id: string;
  changed: boolean;
  price: number | null;
  calculated_price: number | null;
  area_sqft: number | null;
  nearby_places: unknown;
  primaryPriceLabel: string;
  plotSizeLabel: string;
}

function mergeMetaDefaults(meta: PropertyStructuredMeta | null): PropertyStructuredMeta {
  const empty = emptyPropertyStructuredMeta();
  if (!meta) return empty;
  return {
    ...empty,
    ...meta,
    pricing: { ...empty.pricing, ...meta.pricing },
    specs: { ...empty.specs, ...meta.specs },
    basic: { ...empty.basic, ...meta.basic },
    location: { ...empty.location, ...meta.location },
    media: { ...empty.media, ...meta.media },
    documents: { ...empty.documents, ...meta.documents },
    seo: { ...empty.seo, ...meta.seo },
    publishing: { ...empty.publishing, ...meta.publishing },
    ai: meta.ai ?? empty.ai,
    importKnowledge: meta.importKnowledge ?? empty.importKnowledge,
    fieldConfidence: meta.fieldConfidence ?? empty.fieldConfidence,
  };
}

export function normalizePropertyPricingRow(row: LegacyPropertyRow): NormalizeResult {
  const places = extractNearbyPlacesList(row.nearby_places);
  const rawMeta = extractPropertyMeta(row.nearby_places);
  const meta = mergeMetaDefaults(rawMeta);

  const normalized = normalizePricing({
    dbPrice: row.price,
    dbAreaSqft: row.area_sqft,
    subType: row.sub_type,
    propertyTypeLabel: row.sub_type,
    meta,
  });

  const nextMeta = applyNormalizedPricingToMeta(meta, normalized);

  // Sync structuredFields in brain knowledge when present
  if (nextMeta.importKnowledge) {
    nextMeta.importKnowledge = {
      ...nextMeta.importKnowledge,
      structuredFields: {
        ...nextMeta.importKnowledge.structuredFields,
        ...(normalized.pricePerSqyd != null
          ? { pricePerYard: String(normalized.pricePerSqyd), pricePerSqyd: String(normalized.pricePerSqyd) }
          : {}),
        ...(normalized.pricePerSqft != null ? { pricePerSqFt: String(normalized.pricePerSqft) } : {}),
        ...(normalized.pricePerAcre != null ? { pricePerAcre: String(normalized.pricePerAcre) } : {}),
        ...(normalized.totalPrice != null ? { totalPrice: String(normalized.totalPrice), price: String(normalized.totalPrice) } : {}),
        ...(normalized.minPlotSize != null ? { minPlotSize: String(normalized.minPlotSize) } : {}),
        ...(normalized.maxPlotSize != null ? { maxPlotSize: String(normalized.maxPlotSize) } : {}),
        ...(normalized.plotSizeUnit ? { plotSizeUnit: normalized.plotSizeUnit } : {}),
        ...(normalized.plotSizeLabel ? { plotSizes: normalized.plotSizeLabel } : {}),
      },
    };
  }

  const nearby_places = buildNearbyPlacesPayload(places, nextMeta);

  // Plots: clear corrupted concatenated area_sqft; keep apartment areas
  let area_sqft = row.area_sqft ?? null;
  if (row.sub_type === "plot") {
    area_sqft = null;
  } else if (area_sqft && area_sqft >= 50_000) {
    area_sqft = normalized.minPlotSize;
  }

  const priced = formatPropertyPrice({
    price: row.price,
    area_sqft: area_sqft,
    sub_type: row.sub_type,
    meta: nextMeta,
    nearby_places,
  });

  // Persist market total; never keep a unit-rate value in price
  const calculated_price = priced.numericPrice > 0 ? priced.numericPrice : null;
  const price =
    row.price && row.price >= 100_000
      ? row.price
      : calculated_price;

  const before = JSON.stringify(row.nearby_places ?? null);
  const after = JSON.stringify(nearby_places);
  const priorCalculated = (row as { calculated_price?: number | null }).calculated_price ?? null;
  const changed =
    before !== after ||
    (row.area_sqft ?? null) !== (area_sqft ?? null) ||
    (row.price ?? null) !== (price ?? null) ||
    priorCalculated !== calculated_price;

  return {
    id: row.id,
    changed,
    price,
    calculated_price,
    area_sqft,
    nearby_places,
    primaryPriceLabel: priced.displayPrice || normalized.primaryPriceLabel,
    plotSizeLabel: priced.sizeLabel || normalized.plotSizeLabel,
  };
}
