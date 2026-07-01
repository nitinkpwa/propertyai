import { NextResponse } from "next/server";
import {
  areaIntelligenceService,
  generateOpenAIInsights,
} from "@/lib/intelligence/AreaIntelligenceService";
import { fetchPropertyIntelligenceInput } from "@/lib/intelligence/data/marketContext";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [report, property] = await Promise.all([
    areaIntelligenceService.generateReport(id),
    fetchPropertyIntelligenceInput(id),
  ]);

  if (!report || !property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      outlook: null,
      error: "OpenAI not configured",
    });
  }

  try {
    const outlook = await generateOpenAIInsights(
      property.title,
      property.city,
      property.location,
      report,
    );

    return NextResponse.json({
      outlook,
      source: "OpenAI Analysis",
    });
  } catch (error) {
    console.error("intelligence insights:", error);
    return NextResponse.json({ outlook: null, error: "Failed to generate insights" }, { status: 500 });
  }
}
