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

  const context: PropertyContext = {
    id: property.id,
    name: property.name,
    location: property.location,
    city: property.city,
    price: property.price,
    bhk: property.bhk,
    area: property.area,
    builderName: property.builder.name,
    growthScore: property.intelligenceReport?.growthScore.value ?? null,
    rentalYield: property.intelligenceReport?.rentalYield.value ?? null,
    possession: property.possession,
    propertyType: property.propertyType,
  };

  return NextResponse.json(context);
}
