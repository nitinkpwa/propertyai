import { NextRequest, NextResponse } from "next/server";
import { fetchPropertyAskContext } from "@/lib/properties/askContext";
import { endPerfRequest, recordPerf, startPerfRequest, timed } from "@/lib/perf/timing";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  startPerfRequest(`/api/properties/${id}/context`);
  const t0 = performance.now();
  try {
    const context = await timed("api.propertyContext.light", () =>
      fetchPropertyAskContext(id),
    );

    if (!context) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    return NextResponse.json(context);
  } finally {
    recordPerf("api.propertyContext.total", performance.now() - t0, { id, light: true });
    endPerfRequest("api.propertyContext");
  }
}
