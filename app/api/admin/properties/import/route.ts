import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin/auth";
import { runPropertyImport } from "@/lib/admin/property/studio/runImport";
import type { PropertyImportRequest } from "@/lib/admin/property/studio/types";

export async function POST(req: NextRequest) {
  const access = await requireAdminApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = (await req.json().catch(() => null)) as PropertyImportRequest | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const hasSignal =
    Boolean(body.whatsappText?.trim()) ||
    (body.images?.length ?? 0) > 0 ||
    (body.documents?.length ?? 0) > 0;

  if (!hasSignal) {
    return NextResponse.json(
      { error: "Paste a WhatsApp message or upload images/documents to generate a listing." },
      { status: 400 },
    );
  }

  try {
    const result = await runPropertyImport({
      whatsappText: body.whatsappText || "",
      images: body.images || [],
      documents: body.documents || [],
      googleMapsUrl: body.googleMapsUrl || "",
      lat: body.lat || "",
      lng: body.lng || "",
      source: body.source || "whatsapp",
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/admin/properties/import:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 500 },
    );
  }
}
