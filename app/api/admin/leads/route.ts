import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin/auth";
import { loadAdminBuyersFromProfiles } from "@/lib/admin/buyers/loadBuyers";

export async function GET() {
  const access = await requireAdminApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { buyers, leads, count } = await loadAdminBuyersFromProfiles();
    return NextResponse.json({ buyers, leads, count });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load buyers";
    console.error("GET /api/admin/leads:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}