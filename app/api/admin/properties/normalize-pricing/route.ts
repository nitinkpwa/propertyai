import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin/auth";
import { normalizePropertyPricingRow } from "@/lib/properties/normalizeLegacyPricing";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/admin/properties/normalize-pricing
 * Upgrades legacy AI-imported listings into multi-unit pricing + plot range schema.
 */
export async function POST() {
  const access = await requireAdminApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const supabase = createSupabaseServiceClient();
  const { data: rows, error } = await supabase
    .from("properties")
    .select("id, price, area_sqft, sub_type, nearby_places")
    .limit(2000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let updated = 0;
  const samples: Array<{ id: string; primaryPriceLabel: string; plotSizeLabel: string }> = [];

  for (const row of rows || []) {
    const result = normalizePropertyPricingRow(row);
    if (!result.changed) continue;

    const { error: upErr } = await supabase
      .from("properties")
      .update({
        price: result.price,
        calculated_price: result.calculated_price,
        area_sqft: result.area_sqft,
        nearby_places: result.nearby_places,
        updated_at: new Date().toISOString(),
      })
      .eq("id", result.id);

    if (!upErr) {
      updated += 1;
      if (samples.length < 25) {
        samples.push({
          id: result.id,
          primaryPriceLabel: result.primaryPriceLabel,
          plotSizeLabel: result.plotSizeLabel,
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: rows?.length ?? 0,
    updated,
    samples,
  });
}
