import type { IntelligenceProvider, PropertyIntelligenceInput } from "../types";

/** Future provider stub — enable when GOOGLE_MAPS_API_KEY is configured. */
export const googleMapsProvider: IntelligenceProvider<
  PropertyIntelligenceInput,
  { distanceText: string }
> = {
  id: "google-maps",
  source: "Google Maps API",
  isEnabled: () => Boolean(process.env.GOOGLE_MAPS_API_KEY),
  fetch: async () => null,
};

/** Future provider stub — enable when external schools API is integrated. */
export const schoolsApiProvider: IntelligenceProvider<PropertyIntelligenceInput, { count: number }> =
  {
    id: "schools-api",
    source: "Schools API",
    isEnabled: () => Boolean(process.env.SCHOOLS_API_KEY),
    fetch: async () => null,
  };

export const futureProviders = [googleMapsProvider, schoolsApiProvider];
