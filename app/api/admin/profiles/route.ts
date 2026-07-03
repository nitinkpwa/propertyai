import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const access = await requireAdminApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const service = createSupabaseServiceClient();
    const { data, error, count } = await service
      .from("profiles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("GET /api/admin/profiles:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      profiles: data ?? [],
      count: count ?? (data ?? []).length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load profiles";
    console.error("GET /api/admin/profiles:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
