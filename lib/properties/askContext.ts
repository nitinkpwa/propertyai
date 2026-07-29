import "server-only";

import { cache } from "react";
import type { PropertyContext } from "@/lib/ask/engine/types";
import { recordPerf, timed } from "@/lib/perf/timing";
import { formatPropertyPrice } from "@/lib/properties/pricingDisplay";
import {
  PROPERTIES_PUBLIC_BASE_SELECT,
  PROPERTIES_PUBLIC_BASE_SELECT_CORE,
} from "@/lib/seller/propertySchema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rowToAnalyticsSubject, rowToIntelligenceInput } from "./detailInputs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ASK_EXTENDED =
  "builder_name, nearby_places, rera_number, possession, sub_type";

const ASK_SELECT = `${PROPERTIES_PUBLIC_BASE_SELECT}, ${ASK_EXTENDED}`;
const ASK_SELECT_CORE = `${PROPERTIES_PUBLIC_BASE_SELECT_CORE}, ${ASK_EXTENDED}`;

const SUB_TYPE_LABELS: Record<string, string> = {
  apartment: "Apartment",
  villa: "Villa",
  plot: "Plot",
  commercial: "Commercial",
  penthouse: "Penthouse",
  studio: "Studio",
};

/**
 * Lightweight Ask/property-panel context — same metrics as before, without
 * similar-listings fetch or full PropertyDetail RSC serialization.
 */
async function fetchPropertyAskContextUncached(
  id: string,
): Promise<PropertyContext | null> {
  const normalizedId = id?.trim();
  if (!normalizedId || !UUID_RE.test(normalizedId)) return null;

  const t0 = performance.now();
  try {
    const supabase = await createSupabaseServerClient();
    const primary = await timed("askContext.select", async () =>
      await supabase
        .from("properties")
        .select(ASK_SELECT)
        .eq("id", normalizedId)
        .maybeSingle(),
    );

    let data: unknown = primary.data;
    let error = primary.error;

    if (error && /calculated_price/i.test(error.message)) {
      const retry = await timed("askContext.selectCoreRetry", async () =>
        await supabase
          .from("properties")
          .select(ASK_SELECT_CORE)
          .eq("id", normalizedId)
          .maybeSingle(),
      );
      data = retry.data;
      error = retry.error;
    }

    if (error || !data) {
      if (error) console.error("fetchPropertyAskContext:", error.message);
      return null;
    }

    const row = data as Parameters<typeof rowToIntelligenceInput>[0] & {
      sub_type?: string | null;
      builder_name?: string | null;
      possession?: string | null;
      calculated_price?: number | null;
    };

    const [
      { fetchMarketContext },
      { areaIntelligenceService },
      { runPropertyAnalyticsFromSubject },
      { buildPropertyIntelligenceBundle },
    ] = await Promise.all([
      import("@/lib/intelligence/data/marketContext"),
      import("@/lib/intelligence/AreaIntelligenceService"),
      import("@/lib/analytics"),
      import("@/lib/properties/intelligenceBundle"),
    ]);

    const marketContext = await timed("askContext.marketContext", () =>
      fetchMarketContext(row.city, row.location, row.id),
    );

    const [intelligenceReport, analytics] = await Promise.all([
      timed("askContext.areaIntelligence", () =>
        areaIntelligenceService.generateReportFromInputs(
          rowToIntelligenceInput(row),
          marketContext,
        ),
      ),
      timed("askContext.analytics", () =>
        runPropertyAnalyticsFromSubject(rowToAnalyticsSubject(row)),
      ),
    ]);

    const priced = formatPropertyPrice({
      price: row.price,
      calculated_price: (row as { calculated_price?: number | null }).calculated_price,
      area_sqft: row.area_sqft,
      sub_type: row.sub_type,
      nearby_places: row.nearby_places,
    });

    const price = priced.numericPrice;
    const area =
      priced.isPlot && priced.minPlotSize
        ? priced.minPlotSize
        : row.area_sqft && row.area_sqft < 50_000
          ? row.area_sqft
          : priced.minPlotSize ?? 0;
    const pricePerSqFt = priced.pricePerSqft ?? 0;
    const builderName =
      row.builder_name?.trim() || row.contact_name?.trim() || "Builder";
    const propertyType = SUB_TYPE_LABELS[row.sub_type ?? ""] ?? "Property";

    const bundle = buildPropertyIntelligenceBundle({
      id: row.id,
      name: row.title?.trim() || "Property",
      price,
      pricePerSqFt,
      area,
      status: "Available",
      possession: row.possession?.trim() || "Contact for details",
      city: row.city?.trim() || "Tricity",
      location: row.location?.trim() || "Location not specified",
      builderName,
      amenities: [],
      reraVerified: Boolean(row.rera_number?.trim()),
      aiVerified: false,
      report: intelligenceReport,
      meta: null,
      market: marketContext,
      similarProperties: [],
      nearbyPlaces: [],
      analytics,
    });

    const priceAnalysis = bundle.priceAnalysis;
    const scores = bundle.scores;
    const growth = bundle.appreciation;

    const context: PropertyContext = {
      id: row.id,
      name: row.title?.trim() || "Property",
      location: row.location?.trim() || "Location not specified",
      city: row.city?.trim() || "Tricity",
      price,
      bhk: row.bedrooms || 1,
      area,
      builderName,
      growthScore: scores?.futureGrowth.available ? scores.futureGrowth.value : null,
      rentalYield: intelligenceReport?.rentalYield.value ?? null,
      possession: row.possession?.trim() || "Contact for details",
      propertyType,
      analytics: priceAnalysis
        ? {
            currentPsf: priceAnalysis.available ? priceAnalysis.pricePerSqFt : null,
            areaAveragePsf: priceAnalysis.available ? priceAnalysis.averagePsf : null,
            differencePercent: priceAnalysis.available
              ? priceAnalysis.differencePercent
              : null,
            marketPosition: priceAnalysis.available
              ? priceAnalysis.marketPosition
              : null,
            priceConfidence: priceAnalysis.available ? priceAnalysis.confidence : null,
            investmentScore: scores?.investment.available
              ? scores.investment.value
              : null,
            investmentConfidence: scores?.investment.confidence ?? null,
            fairValueExpected: priceAnalysis.available
              ? priceAnalysis.fairValueEstimate
              : null,
            growthRange:
              growth?.baseAnnualRate != null ? growth.expectedGrowthLabel : null,
            comparableCount: priceAnalysis.comparableCount,
            priceOpinion: priceAnalysis.aiOpinion,
          }
        : null,
    };

    recordPerf("askContext.total", performance.now() - t0, {
      id: normalizedId,
      light: true,
    });
    return context;
  } catch (error) {
    console.error("fetchPropertyAskContext:", error);
    recordPerf("askContext.total", performance.now() - t0, {
      id: normalizedId,
      failed: true,
    });
    return null;
  }
}

export const fetchPropertyAskContext = cache(fetchPropertyAskContextUncached);
