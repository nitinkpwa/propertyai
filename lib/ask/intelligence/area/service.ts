import { supabase } from "@/lib/supabase";
import { UNAVAILABLE_COPY } from "../taxonomy";
import type { AreaIntelligence } from "../types";

function emptyArea(locality: string): AreaIntelligence {
  return {
    locality,
    overview: null,
    connectivity: null,
    airportDistance: null,
    metro: null,
    schools: null,
    hospitals: null,
    malls: null,
    futureInfrastructure: null,
    demand: null,
    supply: null,
    rentalMarket: null,
    capitalAppreciation: null,
    builderActivity: null,
    riskLevel: null,
    suitableFor: [],
    source: "unavailable",
  };
}

/**
 * Area Knowledge Engine — database-backed.
 * Falls back to unavailable (never hardcodes market facts into answers).
 */
export async function getAreaIntelligence(
  locality: string | null,
  city: string | null,
): Promise<AreaIntelligence | null> {
  const key = (locality ?? city)?.trim();
  if (!key) return null;

  try {
    const { data, error } = await supabase
      .from("area_intelligence")
      .select("*")
      .or(`locality.ilike.%${key}%,city.ilike.%${key}%`)
      .limit(1)
      .maybeSingle();

    if (error) {
      // Table may not exist yet
      if (error.message.includes("area_intelligence") || error.code === "42P01") {
        return { ...emptyArea(key), overview: UNAVAILABLE_COPY };
      }
      console.error("getAreaIntelligence:", error.message);
      return { ...emptyArea(key), overview: UNAVAILABLE_COPY };
    }

    if (!data) {
      return { ...emptyArea(key), overview: UNAVAILABLE_COPY };
    }

    return {
      locality: (data.locality as string) ?? key,
      overview: (data.overview as string) ?? null,
      connectivity: (data.connectivity as string) ?? null,
      airportDistance: (data.airport_distance as string) ?? null,
      metro: (data.metro as string) ?? null,
      schools: (data.schools as string) ?? null,
      hospitals: (data.hospitals as string) ?? null,
      malls: (data.malls as string) ?? null,
      futureInfrastructure: (data.future_infrastructure as string) ?? null,
      demand: (data.demand as string) ?? null,
      supply: (data.supply as string) ?? null,
      rentalMarket: (data.rental_market as string) ?? null,
      capitalAppreciation: (data.capital_appreciation as string) ?? null,
      builderActivity: (data.builder_activity as string) ?? null,
      riskLevel: (data.risk_level as string) ?? null,
      suitableFor: Array.isArray(data.suitable_for)
        ? (data.suitable_for as string[])
        : [],
      source: "database",
    };
  } catch {
    return { ...emptyArea(key), overview: UNAVAILABLE_COPY };
  }
}

export function formatAreaForComposer(area: AreaIntelligence | null): string {
  if (!area) return "Area Intelligence: not requested.";
  if (area.source === "unavailable") {
    return `Area Intelligence for ${area.locality}: ${UNAVAILABLE_COPY}`;
  }
  return [
    `Area: ${area.locality}`,
    area.overview && `Overview: ${area.overview}`,
    area.connectivity && `Connectivity: ${area.connectivity}`,
    area.airportDistance && `Airport: ${area.airportDistance}`,
    area.metro && `Metro: ${area.metro}`,
    area.schools && `Schools: ${area.schools}`,
    area.hospitals && `Hospitals: ${area.hospitals}`,
    area.malls && `Malls: ${area.malls}`,
    area.futureInfrastructure && `Future infra: ${area.futureInfrastructure}`,
    area.demand && `Demand: ${area.demand}`,
    area.supply && `Supply: ${area.supply}`,
    area.rentalMarket && `Rental: ${area.rentalMarket}`,
    area.capitalAppreciation && `Appreciation: ${area.capitalAppreciation}`,
    area.builderActivity && `Builder activity: ${area.builderActivity}`,
    area.riskLevel && `Risk: ${area.riskLevel}`,
    area.suitableFor.length && `Suitable for: ${area.suitableFor.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}
