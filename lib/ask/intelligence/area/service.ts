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

/** App-level placeholders when area_intelligence rows are not seeded yet. */
const PLACEHOLDER_AREAS: Record<string, AreaIntelligence> = {
  dhakoli: {
    locality: "Dhakoli",
    overview:
      "Dhakoli is an emerging Zirakpur micro-market near Patiala Road with improving residential inventory and mid-segment buyer demand. AreaIQ Score placeholder: 76/100. Market confidence: medium.",
    connectivity:
      "Patiala Road / NH access toward Zirakpur and Banur; Chandigarh reachable via VIP Road belt.",
    airportDistance: "~12–18 km to Chandigarh Airport (IXC) depending on route.",
    metro: "No operational metro; rely on road corridors.",
    schools:
      "Local schools in Zirakpur / Baltana catchment; verify commute for specific projects.",
    hospitals:
      "Hospitals concentrated in Zirakpur and Panchkula — check project-level distance.",
    malls: "Retail along VIP Road and Zirakpur high street.",
    futureInfrastructure: "Continued Zirakpur corridor densification and road upgrades.",
    demand: "Medium — steady end-user and investor interest in value segment.",
    supply: "Medium — selective new launches; not overbuilt vs core VIP Road.",
    rentalMarket: "Indicative rental yield placeholder ~3.9%.",
    capitalAppreciation: "Placeholder growth outlook moderate; validate with live comps.",
    builderActivity:
      "Regional developers active in Zirakpur belt — verify delivery track record.",
    riskLevel: "Medium — title/RERA checks still essential on every deal.",
    suitableFor: ["end_user", "value_investors", "first_home"],
    source: "placeholder",
  },
  "peer muchalla": {
    locality: "Peer Muchalla",
    overview:
      "Peer Muchalla sits on the VIP Road growth belt of Zirakpur with stronger connectivity cues than outer Patiala Road pockets. AreaIQ Score placeholder: 78/100. Market confidence: medium-high.",
    connectivity:
      "VIP Road primary access; links toward Zirakpur, Gazipur, and airport-side corridors.",
    airportDistance: "~10–16 km to Chandigarh Airport (IXC) depending on route.",
    metro: "No operational metro; road-led connectivity.",
    schools: "Schools accessible via Zirakpur / VIP Road catchment.",
    hospitals:
      "Multi-specialty options in Zirakpur and Panchkula within typical drive times.",
    malls: "VIP Road retail and Zirakpur commercial nodes.",
    futureInfrastructure: "VIP Road densification and Zirakpur infrastructure pipeline.",
    demand: "Medium — healthy enquiry for mid-premium inventory.",
    supply: "Medium — balanced vs demand; watch new tower supply.",
    rentalMarket: "Indicative rental yield placeholder ~4.0%.",
    capitalAppreciation: "Placeholder growth outlook constructive along VIP Road.",
    builderActivity:
      "Mix of regional and established Tricity builders — diligence required.",
    riskLevel: "Medium — standard Tricity legal diligence applies.",
    suitableFor: ["end_user", "investors", "rental_seekers"],
    source: "placeholder",
  },
};

function placeholderFor(key: string): AreaIntelligence | null {
  const normalized = key.trim().toLowerCase().replace(/[-_]+/g, " ");
  return PLACEHOLDER_AREAS[normalized] ?? null;
}

/**
 * Area Knowledge Engine — database-backed.
 * Falls back to curated placeholders for newly registered markets, then unavailable.
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
        return placeholderFor(key) ?? { ...emptyArea(key), overview: UNAVAILABLE_COPY };
      }
      console.error("getAreaIntelligence:", error.message);
      return placeholderFor(key) ?? { ...emptyArea(key), overview: UNAVAILABLE_COPY };
    }

    if (!data) {
      return placeholderFor(key) ?? { ...emptyArea(key), overview: UNAVAILABLE_COPY };
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
    return placeholderFor(key) ?? { ...emptyArea(key), overview: UNAVAILABLE_COPY };
  }
}

export function formatAreaForComposer(area: AreaIntelligence | null): string {
  if (!area) return "Area Intelligence: not requested.";
  if (area.source === "unavailable") {
    return `Area Intelligence for ${area.locality}: ${UNAVAILABLE_COPY}`;
  }
  return [
    `Area: ${area.locality}`,
    area.source === "placeholder" ? "Source: AreaIQ placeholder (seed pending)" : null,
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
