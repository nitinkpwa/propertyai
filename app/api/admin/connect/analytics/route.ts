import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin/auth";
import { fetchConnectPartnersList } from "@/lib/connect/partners/queries";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const access = await requireAdminApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const supabase = createSupabaseServiceClient();
  const partners = await fetchConnectPartnersList(supabase);

  const totals = partners.reduce(
    (acc, p) => ({
      partners: acc.partners + 1,
      activePartners: acc.activePartners + (p.status === "active" ? 1 : 0),
      buyers: acc.buyers + p.assigned_buyers,
      listings: acc.listings + p.listing_count,
    }),
    { partners: 0, activePartners: 0, buyers: 0, listings: 0 },
  );

  const byStatus = ["pending", "active", "suspended", "archived"].map((status) => ({
    status,
    count: partners.filter((p) => p.status === status).length,
  }));

  return NextResponse.json({ totals, byStatus, partners: partners.length });
}
