import { NextRequest, NextResponse } from "next/server";
import { fetchPropertyDetailById } from "@/lib/properties/detail";
import type { PropertyContext } from "@/lib/ask/engine/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const property = await fetchPropertyDetailById(id);

  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const price = property.intelligenceBundle?.priceAnalysis;
  const scores = property.intelligenceBundle?.scores;
  const growth = property.intelligenceBundle?.appreciation;

  const context: PropertyContext = {
    id: property.id,
    name: property.name,
    location: property.location,
    city: property.city,
    price: property.price,
    bhk: property.bhk,
    area: property.area,
    builderName: property.builder.name,
    growthScore: scores?.futureGrowth.available ? scores.futureGrowth.value : null,
    rentalYield: property.intelligenceReport?.rentalYield.value ?? null,
    possession: property.possession,
    propertyType: property.propertyType,
    analytics: price
      ? {
          currentPsf: price.available ? price.pricePerSqFt : null,
          areaAveragePsf: price.available ? price.averagePsf : null,
          differencePercent: price.available ? price.differencePercent : null,
          marketPosition: price.available ? price.marketPosition : null,
          priceConfidence: price.available ? price.confidence : null,
          investmentScore: scores?.investment.available ? scores.investment.value : null,
          investmentConfidence: scores?.investment.confidence ?? null,
          fairValueExpected: price.available ? price.fairValueEstimate : null,
          growthRange:
            growth?.baseAnnualRate != null ? growth.expectedGrowthLabel : null,
          comparableCount: price.comparableCount,
          priceOpinion: price.aiOpinion,
        }
      : null,
  };

  return NextResponse.json(context);
}
