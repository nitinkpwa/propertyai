import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin/auth";
import { fetchConnectPartnersList } from "@/lib/connect/partners/queries";
import { createConnectPartnerAccount } from "@/lib/connect/partners/service";
import { validateCreateConnectPartner } from "@/lib/connect/partners/validation";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const access = await requireAdminApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const supabase = createSupabaseServiceClient();
    const partners = await fetchConnectPartnersList(supabase);
    return NextResponse.json({ partners });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load partners";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const access = await requireAdminApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await req.json().catch(() => ({}));

  const validationError = validateCreateConnectPartner({
    companyName: body.companyName ?? "",
    managerName: body.managerName ?? "",
    phone: body.phone ?? "",
    email: body.email ?? "",
    password: body.password ?? "",
    status: body.status,
  });

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServiceClient();
    const result = await createConnectPartnerAccount(
      supabase,
      {
        companyName: body.companyName,
        managerName: body.managerName,
        phone: body.phone,
        email: body.email,
        password: body.password,
        address: body.address,
        city: body.city,
        gst: body.gst,
        rera: body.rera,
        logo: body.logo,
        notes: body.notes,
        status: body.status ?? "pending",
      },
      access.userId,
    );

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create partner";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
