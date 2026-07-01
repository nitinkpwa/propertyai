import type { IntentClassification, PropertyContext } from "./types";

export function buildMemoryContext(classification: IntentClassification): string {
  const parts: string[] = [];

  if (classification.budget) {
    parts.push(`Budget: ₹${Math.round(classification.budget / 100_000)} lakh`);
  }
  if (classification.bedrooms) {
    parts.push(`BHK: ${classification.bedrooms}`);
  }
  if (classification.location) {
    parts.push(`Preferred area: ${classification.location}`);
  }
  if (classification.entities.city) {
    parts.push(`City: ${classification.entities.city}`);
  }
  if (classification.entities.locality) {
    parts.push(`Locality: ${classification.entities.locality}`);
  }
  if (classification.investmentPurpose) {
    parts.push(`Purpose: ${classification.investmentPurpose.replace("-", " ")}`);
  }
  if (classification.builder) {
    parts.push(`Builder preference: ${classification.builder}`);
  }
  if (classification.entities.investmentFocus) {
    parts.push(`Investment focus: ${classification.entities.investmentFocus}`);
  }

  if (parts.length === 0) return "";

  return `\n\nCONVERSATION MEMORY (do not re-ask for these):\n${parts.map((p) => `- ${p}`).join("\n")}`;
}

export function buildPropertyPageContext(property: PropertyContext): string {
  const priceLakh = Math.round(property.price / 100_000);
  const pricePerSqft =
    property.area > 0 ? Math.round(property.price / property.area) : null;

  return `\n\nCURRENT PROPERTY PAGE CONTEXT (user is viewing this property):
- ID: ${property.id}
- Name: ${property.name}
- Location: ${property.location}, ${property.city}
- Price: ₹${priceLakh} lakh${pricePerSqft ? ` (₹${pricePerSqft.toLocaleString("en-IN")}/sqft)` : ""}
- Configuration: ${property.bhk} BHK | ${property.area} sqft
- Builder: ${property.builderName}
- Possession: ${property.possession}
- Type: ${property.propertyType}
- AreaIQ Growth Score: ${property.growthScore !== null ? `${property.growthScore}/100` : "N/A"}
- Rental Yield: ${property.rentalYield !== null ? `${property.rentalYield}%` : "N/A"}
When user says "this property", "tell me more", or "is it good" — they mean THIS property.`;
}

export function wantsAlternativeProperties(message: string): boolean {
  return /\b(another|other option|different option|alternatives?|something else|not these|show more options|different property|different project|other properties|show another)\b/i.test(
    message,
  );
}

export function buildPropertyMemoryContext(
  excludePropertyIds: string[],
  wantsAlternative: boolean,
): string {
  if (!excludePropertyIds.length) return "";

  if (wantsAlternative) {
    return `\n\nPROPERTY MEMORY: User already saw these property IDs — do NOT recommend them again unless explicitly asked: ${excludePropertyIds.join(", ")}. Show different matching properties from the database.`;
  }

  return `\n\nPREVIOUSLY SUGGESTED PROPERTIES (IDs): ${excludePropertyIds.join(", ")}. Prefer fresh alternatives when user asks for "another option" or "something different".`;
}
