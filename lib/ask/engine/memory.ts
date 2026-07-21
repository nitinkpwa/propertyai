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
  const a = property.analytics;
  const psf =
    a?.currentPsf ??
    (property.area > 0 ? Math.round(property.price / property.area) : null);

  const analyticsBlock = a
    ? `
VERIFIED ANALYTICS ENGINE METRICS (explain these only — NEVER invent or recalculate numbers):
- Current price/sqft: ${a.currentPsf != null ? `₹${a.currentPsf.toLocaleString("en-IN")}` : "Insufficient verified data"}
- Area average/sqft: ${a.areaAveragePsf != null ? `₹${a.areaAveragePsf.toLocaleString("en-IN")}` : "Insufficient verified data"}
- Difference vs average: ${a.differencePercent != null ? `${a.differencePercent}%` : "Insufficient verified data"}
- Market position: ${a.marketPosition ?? "Insufficient verified data"}
- Price confidence: ${a.priceConfidence != null ? `${a.priceConfidence}%` : "Insufficient verified data"}
- Comparables used: ${a.comparableCount}
- Fair value (expected): ${a.fairValueExpected != null ? `₹${a.fairValueExpected.toLocaleString("en-IN")}` : "Insufficient verified data"}
- Investment score: ${a.investmentScore != null ? `${a.investmentScore}/100` : "Insufficient verified data"}${a.investmentConfidence != null ? ` (confidence ${a.investmentConfidence}%)` : ""}
- Growth range: ${a.growthRange ?? "Insufficient verified data"}
- Engine opinion: ${a.priceOpinion ?? "Insufficient verified data"}
If a metric says Insufficient verified data, tell the user that — do not guess.`
    : `
VERIFIED SCORES:
- Growth: ${property.growthScore !== null ? `${property.growthScore}/100` : "Insufficient verified data"}
- Rental yield: ${property.rentalYield !== null ? `${property.rentalYield}%` : "Insufficient verified data"}
Never invent replacement percentages or scores.`;

  return `\n\nCURRENT PROPERTY PAGE CONTEXT (user is viewing this property):
- ID: ${property.id}
- Name: ${property.name}
- Location: ${property.location}, ${property.city}
- Price: ₹${priceLakh} lakh${psf ? ` (₹${psf.toLocaleString("en-IN")}/sqft)` : ""}
- Configuration: ${property.bhk} BHK | ${property.area} sqft
- Builder: ${property.builderName}
- Possession: ${property.possession}
- Type: ${property.propertyType}
${analyticsBlock}
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
