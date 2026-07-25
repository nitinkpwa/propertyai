import { searchPropertiesByLocality, searchPropertiesByName } from "../../search";
import type { ListingProperty } from "@/lib/properties/types";
import { calculateLegalCompliance } from "@/lib/properties/legalCompliance";
import type { AskEngineResponse, HandlerContext, PropertyContext } from "../types";
import { classificationToResponseFields } from "../types";
import { resolvePropertyName } from "../classifier";
import { buildMemoryContext, buildPropertyPageContext } from "../memory";
import { logAsk } from "../logger";
import {
  buildListingsContext,
  buildSinglePropertyContext,
  generateAreaIQResponse,
  PROPERTY_ANALYSIS_PROMPT,
} from "../openai";
import { NOT_IN_DATABASE_MESSAGE } from "../prompts";

function listingToPropertyContext(listing: ListingProperty): PropertyContext {
  return {
    id: listing.id,
    name: listing.name,
    location: listing.location,
    city: listing.city ?? "",
    price: listing.price,
    bhk: listing.bhk,
    area: listing.area,
    builderName: listing.builderName,
    growthScore: listing.growthScore,
    rentalYield: listing.rentalYield,
    possession: listing.possession,
    propertyType: listing.propertyType,
  };
}

export async function handlePropertyAnalysis(
  ctx: HandlerContext,
): Promise<AskEngineResponse> {
  const baseFields = classificationToResponseFields(ctx.classification);
  const memoryContext = buildMemoryContext(ctx.classification);
  const propertyName = resolvePropertyName(ctx.classification);

  let primaryListing: ListingProperty | null = null;
  let nearbyListings: ListingProperty[] = [];
  let propertyContextStr = "";

  if (ctx.propertyContext) {
    propertyContextStr = buildPropertyPageContext(ctx.propertyContext);
    logAsk({
      event: "property_context_used",
      propertyId: ctx.propertyContext.id,
      propertyName: ctx.propertyContext.name,
    });

    const localityResult = await searchPropertiesByLocality(ctx.propertyContext.city);
    nearbyListings = localityResult.listings
      .filter((l) => l.id !== ctx.propertyContext!.id)
      .slice(0, 5);

    primaryListing = {
      id: ctx.propertyContext.id,
      name: ctx.propertyContext.name,
      location: ctx.propertyContext.location,
      city: ctx.propertyContext.city,
      price: ctx.propertyContext.price,
      builderName: ctx.propertyContext.builderName,
      bhk: ctx.propertyContext.bhk,
      area: ctx.propertyContext.area,
      areaUnit: "sqft",
      growthScore: ctx.propertyContext.growthScore,
      rentalYield: ctx.propertyContext.rentalYield,
      imageUrl: null,
      imageAlt: ctx.propertyContext.name,
      aiVerified: false,
      reraVerified: false,
      legalFlags: null,
      legalCompliance: calculateLegalCompliance(null),
      propertyType: ctx.propertyContext.propertyType as ListingProperty["propertyType"],
      listingType: "buy",
      possession: ctx.propertyContext.possession as ListingProperty["possession"],
      amenities: [],
    };
  } else if (propertyName) {
    logAsk({
      event: "supabase_query_start",
      intent: "PROPERTY_ANALYSIS",
      propertyName,
    });

    const result = await searchPropertiesByName(propertyName);
    primaryListing = result.listings[0] ?? null;
    nearbyListings = result.listings.slice(1, 6);

    logAsk({
      event: "supabase_query_complete",
      intent: "PROPERTY_ANALYSIS",
      propertyName,
      found: Boolean(primaryListing),
    });

    if (primaryListing) {
      propertyContextStr = buildSinglePropertyContext(listingToPropertyContext(primaryListing));
    }
  }

  const listingsContext = primaryListing
    ? buildListingsContext([primaryListing, ...nearbyListings])
    : undefined;

  let userMessage = ctx.message;
  if (!primaryListing && !ctx.propertyContext) {
    userMessage = `${ctx.message}\n\n${NOT_IN_DATABASE_MESSAGE} Provide general market information about the area/builder if identifiable from the query.`;
  }

  const answer = await generateAreaIQResponse(PROPERTY_ANALYSIS_PROMPT, userMessage, {
    history: ctx.history,
    memoryContext,
    propertyContext: propertyContextStr,
    listingsContext,
    maxTokens: 2000,
  });

  const properties = primaryListing ? [primaryListing, ...nearbyListings.slice(0, 4)] : [];

  return {
    intent: "PROPERTY_ANALYSIS",
    answer,
    ...baseFields,
    properties,
    propertyRationales: primaryListing
      ? { [primaryListing.id]: "Primary property analyzed in this report." }
      : {},
    suggestions: properties.length > 0 ? ["Compare these", "Calculate EMI", "Show cheaper options"] : [],
    followUpQuestions: [
      "Compare with nearby projects",
      "Is this good for rental income?",
      "Calculate EMI for this property",
    ],
    stats: null,
    searchedDatabase: Boolean(primaryListing || ctx.propertyContext),
    isSimilar: false,
  };
}
