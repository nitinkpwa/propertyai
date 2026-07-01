import type { ConnectivityResult, IntelligenceMetric, PropertyIntelligenceInput } from "../types";
import { availableMetric, unavailableMetric } from "../utils";

function findPlace(
  property: PropertyIntelligenceInput,
  types: string[],
): IntelligenceMetric<string> {
  const match = property.nearbyPlaces.find((place) => {
    const type = place.type?.toLowerCase() ?? "";
    const name = place.name?.toLowerCase() ?? "";
    return types.some(
      (needle) => type.includes(needle) || name.includes(needle),
    );
  });

  if (!match?.distance) {
    return unavailableMetric("Data not available yet");
  }

  const label = match.name ? `${match.name} — ${match.distance}` : match.distance;
  return availableMetric(label, label, "AreaIQ Database");
}

export function getConnectivity(
  property: PropertyIntelligenceInput,
): ConnectivityResult {
  if (property.nearbyPlaces.length === 0) {
    const unavailable = unavailableMetric<string>("Data not available yet");
    return {
      airport: unavailable,
      metro: unavailable,
      highways: unavailable,
    };
  }

  return {
    airport: findPlace(property, ["airport"]),
    metro: findPlace(property, ["metro", "transit"]),
    highways: findPlace(property, ["highway", "road", "express"]),
  };
}

export function connectivityScore(connectivity: ConnectivityResult): IntelligenceMetric<number> | null {
  const available = [connectivity.airport, connectivity.metro, connectivity.highways].filter(
    (m) => m.available,
  );
  if (available.length === 0) return null;

  const score = Math.round((available.length / 3) * 100);
  return availableMetric(score, String(score), "AreaIQ Database", {
    factors: available.map((m) => m.displayValue),
  });
}

export function countNearbyByType(
  property: PropertyIntelligenceInput,
  types: string[],
): IntelligenceMetric<number> {
  if (property.nearbyPlaces.length === 0) {
    return unavailableMetric("Data not available yet");
  }

  const count = property.nearbyPlaces.filter((place) => {
    const type = place.type?.toLowerCase() ?? "";
    const name = place.name?.toLowerCase() ?? "";
    return types.some((needle) => type.includes(needle) || name.includes(needle));
  }).length;

  if (count === 0) {
    return unavailableMetric("Data not available yet");
  }

  return availableMetric(count, String(count), "AreaIQ Database");
}
