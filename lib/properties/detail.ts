import "server-only";
import { cache } from "react";
import { recordPerf, timed } from "@/lib/perf/timing";
import {
  PROPERTIES_PUBLIC_BASE_SELECT,
  PROPERTIES_PUBLIC_BASE_SELECT_CORE,
} from "@/lib/seller/propertySchema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PropertyDetail } from "@/app/property/[id]/data";
import { rowToAnalyticsSubject, rowToIntelligenceInput } from "./detailInputs";
import {
  fetchSimilarListingProperties,
  mapPropertyRowToDetail,
} from "./queries";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DETAIL_EXTENDED =
  "builder_name, furnishing, parking, facing, nearby_places, rera_number, possession, featured_image, seller:profiles!properties_seller_id_fkey(full_name)";

/** Public detail — no contact_name / contact_phone (gated via site-visit API). */
const PROPERTY_DETAIL_SELECT = `${PROPERTIES_PUBLIC_BASE_SELECT}, ${DETAIL_EXTENDED}`;
const PROPERTY_DETAIL_SELECT_CORE = `${PROPERTIES_PUBLIC_BASE_SELECT_CORE}, ${DETAIL_EXTENDED}`;

async function fetchPropertyDetailByIdUncached(
  id: string,
): Promise<PropertyDetail | null> {
  const normalizedId = id?.trim();
  if (!normalizedId || !UUID_RE.test(normalizedId)) {
    return null;
  }

  const t0 = performance.now();
  try {
    const supabase = await createSupabaseServerClient();
    // Visibility is enforced by RLS: public/anon only see active; sellers see own rows.
    const primary = await timed(
      "propertyDetail.select",
      async () =>
        await supabase
          .from("properties")
          .select(PROPERTY_DETAIL_SELECT)
          .eq("id", normalizedId)
          .maybeSingle(),
      { id: normalizedId },
    );

    let data: unknown = primary.data;
    let error = primary.error;

    if (error && /calculated_price/i.test(error.message)) {
      console.warn(
        "fetchPropertyDetailById: calculated_price missing — retrying core select",
      );
      const retry = await timed(
        "propertyDetail.selectCoreRetry",
        async () =>
          await supabase
            .from("properties")
            .select(PROPERTY_DETAIL_SELECT_CORE)
            .eq("id", normalizedId)
            .maybeSingle(),
        { id: normalizedId },
      );
      data = retry.data;
      error = retry.error;
    }

    if (error || !data) {
      if (error) {
        console.error("Failed to fetch property detail:", error.message);
      }
      return null;
    }

    const row = data as unknown as Parameters<typeof mapPropertyRowToDetail>[0];

    // Dynamic-import heavy engines so non-property routes avoid evaluating them
    // on the first isolate warm-up when possible.
    const [
      { fetchMarketContext },
      { areaIntelligenceService },
      { runPropertyAnalyticsFromSubject },
    ] = await Promise.all([
      import("@/lib/intelligence/data/marketContext"),
      import("@/lib/intelligence/AreaIntelligenceService"),
      import("@/lib/analytics"),
    ]);

    const intelInput = rowToIntelligenceInput(row);
    const analyticsSubject = rowToAnalyticsSubject(row);

    // Single market fetch (React-cached) shared by intel + detail mapping.
    const marketContext = await timed("propertyDetail.marketContext", () =>
      fetchMarketContext(row.city, row.location, row.id),
    );

    const [similar, intelligenceReport, analytics] = await Promise.all([
      timed("propertyDetail.similarListings", () =>
        fetchSimilarListingProperties(row.city, row.id, 6, supabase),
      ),
      timed("propertyDetail.areaIntelligence", () =>
        areaIntelligenceService.generateReportFromInputs(intelInput, marketContext),
      ),
      timed("propertyDetail.analytics", () =>
        runPropertyAnalyticsFromSubject(analyticsSubject),
      ),
    ]);

    const detail = timedSyncMap(
      row,
      similar,
      intelligenceReport,
      marketContext,
      analytics,
    );
    recordPerf("propertyDetail.total", performance.now() - t0, {
      id: normalizedId,
      similarCount: similar.length,
      deduped: true,
    });
    return detail;
  } catch (error) {
    console.error("Failed to fetch property detail:", error);
    recordPerf("propertyDetail.total", performance.now() - t0, {
      id: normalizedId,
      failed: true,
    });
    return null;
  }
}

function timedSyncMap(
  ...args: Parameters<typeof mapPropertyRowToDetail>
): ReturnType<typeof mapPropertyRowToDetail> {
  const t0 = performance.now();
  try {
    return mapPropertyRowToDetail(...args);
  } finally {
    recordPerf("propertyDetail.mapToDetail", performance.now() - t0);
  }
}

/** Dedupes metadata + page renders in the same request. */
export const fetchPropertyDetailById = cache(fetchPropertyDetailByIdUncached);
