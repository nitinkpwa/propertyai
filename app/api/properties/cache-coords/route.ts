import { NextResponse } from "next/server";
import { tryCreateSupabaseServiceClient } from "@/lib/supabase/service";

type CoordRow = { id: string; lat: number; lng: number };

/**
 * Persist inferred/estimated listing coordinates so future loads use live DB pins.
 * Only fills NULL lat/lng — never overwrites existing coordinates.
 */
export async function POST(request: Request) {
  let body: { coords?: CoordRow[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const coords = (body.coords ?? []).filter(
    (c) =>
      typeof c?.id === "string" &&
      typeof c?.lat === "number" &&
      Number.isFinite(c.lat) &&
      typeof c?.lng === "number" &&
      Number.isFinite(c.lng),
  );

  if (coords.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  const supabase = tryCreateSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { updated: 0, skipped: "no_service_role" },
      { status: 200 },
    );
  }

  let updated = 0;
  for (const row of coords.slice(0, 80)) {
    const { data, error } = await supabase
      .from("properties")
      .update({ lat: row.lat, lng: row.lng })
      .eq("id", row.id)
      .is("lat", null)
      .is("lng", null)
      .select("id");

    if (!error && data && data.length > 0) updated += 1;
  }

  return NextResponse.json({ updated });
}
