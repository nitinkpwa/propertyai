import { NextResponse } from "next/server";
import { areaIntelligenceService } from "@/lib/intelligence/AreaIntelligenceService";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const report = await areaIntelligenceService.generateReport(id);

  if (!report) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  return NextResponse.json({ report });
}
