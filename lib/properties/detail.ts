import "server-only";
import { cache } from "react";
import { areaIntelligenceService } from "@/lib/intelligence/AreaIntelligenceService";
import { fetchMarketContext } from "@/lib/intelligence/data/marketContext";
import {
  PROPERTIES_BASE_SELECT,
  PROPERTIES_BASE_SELECT_CORE,
} from "@/lib/seller/propertySchema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PropertyDetail } from "@/app/property/[id]/data";
import {
  fetchSimilarListingProperties,
  mapPropertyRowToDetail,
} from "./queries";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DETAIL_EXTENDED =
  "builder_name, furnishing, parking, facing, nearby_places, rera_number, possession, featured_image, seller:profiles!properties_seller_id_fkey(full_name)";

/** Use base columns (+ contact) so preview works even when optional score columns are absent. */
const PROPERTY_DETAIL_SELECT = `${PROPERTIES_BASE_SELECT}, ${DETAIL_EXTENDED}`;
const PROPERTY_DETAIL_SELECT_CORE = `${PROPERTIES_BASE_SELECT_CORE}, ${DETAIL_EXTENDED}`;

async function fetchPropertyDetailByIdUncached(
  id: string,
): Promise<PropertyDetail | null> {
  const normalizedId = id?.trim();
  if (!normalizedId || !UUID_RE.test(normalizedId)) {
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();
    // Visibility is enforced by RLS: public/anon only see active; sellers see own rows.
    let { data, error } = await supabase
      .from("properties")
      .select(PROPERTY_DETAIL_SELECT)
      .eq("id", normalizedId)
      .maybeSingle();

    if (error && /calculated_price/i.test(error.message)) {
      console.warn(
        "fetchPropertyDetailById: calculated_price missing — retrying core select",
      );
      ({ data, error } = await supabase
        .from("properties")
        .select(PROPERTY_DETAIL_SELECT_CORE)
        .eq("id", normalizedId)
        .maybeSingle());
    }

    if (error || !data) {
      if (error) {
        console.error("Failed to fetch property detail:", error.message);
      }
      return null;
    }

    const row = data as unknown as Parameters<typeof mapPropertyRowToDetail>[0];
    const [similar, intelligenceReport, marketContext] = await Promise.all([
      fetchSimilarListingProperties(row.city, row.id, 6),
      areaIntelligenceService.generateReport(row.id),
      fetchMarketContext(row.city, row.location, row.id),
    ]);

    return mapPropertyRowToDetail(row, similar, intelligenceReport, marketContext);
  } catch (error) {
    console.error("Failed to fetch property detail:", error);
    return null;
  }
}

/** Dedupes metadata + page renders in the same request. */
export const fetchPropertyDetailById = cache(fetchPropertyDetailByIdUncached);
