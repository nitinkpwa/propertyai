/**
 * Expert-level semantic extraction for Indian real estate marketing copy.
 * Decomposes prose into structured facts — never leaves useful signal only in description.
 */

import { extractPlotSizeFromText } from "@/lib/properties/pricingDisplay";
import {
  emptyExtractedListingFields,
  type BrainFact,
  type ExtractedListingFields,
  type FieldConfidenceMap,
  type StudioDocumentRef,
} from "./types";

type SetFn = (key: keyof ExtractedListingFields, value: string, conf: number, snippet?: string) => void;

const AMENITY_MAP: Array<{ pattern: RegExp; amenity: string; flag?: keyof ExtractedListingFields }> = [
  { pattern: /\bclub\s*house\b/i, amenity: "Club House", flag: "clubHouse" },
  { pattern: /\bswimming\s*pool\b|\bpool\b/i, amenity: "Swimming Pool", flag: "pool" },
  { pattern: /\bgym\b|\bfitness\b/i, amenity: "Gym", flag: "gym" },
  { pattern: /\bpark\b|\bgarden\b/i, amenity: "Park", flag: "park" },
  { pattern: /\blandscape\b/i, amenity: "Landscape", flag: "landscape" },
  { pattern: /\bsecurity\b|\b24\s*x?\s*7\b/i, amenity: "Security", flag: "security" },
  { pattern: /\bpower\s*backup\b|\bdg\b|\bgenerator\b/i, amenity: "Power Backup", flag: "powerBackup" },
  { pattern: /\bwater\s*(?:supply|connection)?\b|\bstp\b/i, amenity: "Water Supply", flag: "water" },
  { pattern: /\bparking\b/i, amenity: "Parking", flag: "parking" },
  { pattern: /\blift\b|\belevator\b/i, amenity: "Lift", flag: "lift" },
];

const FIELD_META: Record<
  string,
  { label: string; category: BrainFact["category"] }
> = {
  projectName: { label: "Project Name", category: "identity" },
  builder: { label: "Builder", category: "identity" },
  developer: { label: "Developer", category: "identity" },
  seller: { label: "Seller", category: "identity" },
  propertyType: { label: "Property Type", category: "product" },
  listingType: { label: "Listing Type", category: "product" },
  segment: { label: "Segment", category: "product" },
  configuration: { label: "Configuration", category: "product" },
  plotSizes: { label: "Plot Sizes", category: "product" },
  minPlotSize: { label: "Min Plot Size", category: "product" },
  maxPlotSize: { label: "Max Plot Size", category: "product" },
  plotSizeUnit: { label: "Plot Size Unit", category: "product" },
  apartmentSizes: { label: "Apartment Sizes", category: "product" },
  price: { label: "Price", category: "pricing" },
  priceRange: { label: "Price Range", category: "pricing" },
  pricePerSqFt: { label: "Price Per Sq Ft", category: "pricing" },
  pricePerYard: { label: "Price Per Yard", category: "pricing" },
  pricePerAcre: { label: "Price Per Acre", category: "pricing" },
  totalPrice: { label: "Total Price", category: "pricing" },
  currency: { label: "Currency", category: "pricing" },
  paymentPlan: { label: "Payment Plan", category: "pricing" },
  possession: { label: "Possession", category: "product" },
  launchStatus: { label: "Launch Status", category: "product" },
  rera: { label: "RERA", category: "compliance" },
  reraStatus: { label: "RERA Status", category: "compliance" },
  projectTrustScore: { label: "Project Trust Score", category: "compliance" },
  roadWidth: { label: "Road Width", category: "connectivity" },
  roadName: { label: "Road Name", category: "connectivity" },
  roadStatus: { label: "Road Status", category: "connectivity" },
  connectivity: { label: "Connectivity", category: "connectivity" },
  connectivityAdvantage: { label: "Connectivity Advantage", category: "connectivity" },
  facing: { label: "Facing", category: "product" },
  location: { label: "Location", category: "location" },
  city: { label: "City", category: "location" },
  sector: { label: "Sector", category: "location" },
  locality: { label: "Locality", category: "location" },
  landmark: { label: "Landmark", category: "location" },
  nearbyLandmark: { label: "Nearby Landmark", category: "location" },
  areaType: { label: "Area Type", category: "location" },
  nearbyAirport: { label: "Nearby Airport", category: "connectivity" },
  airportProximity: { label: "Airport Proximity", category: "connectivity" },
  airportDistance: { label: "Airport Distance", category: "connectivity" },
  metroDistance: { label: "Metro Distance", category: "connectivity" },
  hospitalDistance: { label: "Hospital", category: "location" },
  schoolDistance: { label: "School", category: "location" },
  mallDistance: { label: "Mall", category: "location" },
  highwayDistance: { label: "Highway", category: "connectivity" },
  investmentAdvantage: { label: "Investment Advantage", category: "investment" },
  suitableFor: { label: "Suitable For", category: "investment" },
  investorScore: { label: "Investor Score", category: "investment" },
  buyerPersona: { label: "Buyer Persona", category: "investment" },
  amenities: { label: "Amenities", category: "amenities" },
  phone: { label: "Phone", category: "contact" },
  email: { label: "Email", category: "contact" },
  website: { label: "Website", category: "contact" },
  contactName: { label: "Contact Name", category: "contact" },
  investmentHighlights: { label: "Investment Highlights", category: "investment" },
  buyerHighlights: { label: "Buyer Highlights", category: "investment" },
  keywords: { label: "Keywords", category: "other" },
};

function firstMatch(text: string, patterns: RegExp[]): RegExpMatchArray | null {
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) return m;
  }
  return null;
}

function parseIndianPriceToNumber(raw: string): string {
  const cleaned = raw.replace(/,/g, "").trim();
  const cr = cleaned.match(/([\d.]+)\s*cr/i);
  if (cr) return String(Math.round(parseFloat(cr[1]) * 10_000_000));
  const lac = cleaned.match(/([\d.]+)\s*(?:lakh|lac|l)\b/i);
  if (lac) return String(Math.round(parseFloat(lac[1]) * 100_000));
  const digits = cleaned.replace(/[^\d.]/g, "");
  return digits || "";
}

function guessDocCategory(name: string): StudioDocumentRef["category"] {
  const n = name.toLowerCase();
  if (n.includes("brochure")) return "brochure";
  if (n.includes("price") || n.includes("pricelist") || n.includes("price-list")) return "price_list";
  if (n.includes("layout") || n.includes("floor")) return "layout";
  if (n.includes("payment") || n.includes("plc")) return "payment_plan";
  if (n.includes("rera")) return "rera";
  if (n.includes("master")) return "master_plan";
  return "other";
}

export function classifyDocuments(docs: StudioDocumentRef[]): StudioDocumentRef[] {
  return docs.map((d) => ({
    ...d,
    category: d.category === "other" ? guessDocCategory(d.name) : d.category,
  }));
}

function extractAirportSemantics(text: string, set: SetFn) {
  // "Right Next to Chandigarh International Airport"
  const adj = firstMatch(text, [
    /(?:right\s+)?(?:next\s+to|beside|adjacent\s+to|adjoining|abutting)\s+([A-Za-z0-9 .'-]*airport[A-Za-z0-9 .'-]*)/i,
    /(?:near|close\s+to)\s+([A-Za-z0-9 .'-]*airport[A-Za-z0-9 .'-]*)/i,
  ]);
  if (adj?.[1]) {
    const name = adj[1].replace(/\s+/g, " ").trim();
    set("nearbyAirport", name, 94, adj[0]);
    const proximity = /right\s+next|adjacent|adjoining|beside|abutting/i.test(adj[0])
      ? "Adjacent"
      : /next\s+to/i.test(adj[0])
        ? "Adjacent"
        : "Nearby";
    set("airportProximity", proximity, 92, adj[0]);
    set("airportDistance", proximity, 88, adj[0]);
    set("investmentAdvantage", "Airport Connectivity", 90, adj[0]);
  }

  const dist = firstMatch(text, [
    /(?:airport|chandigarh\s*international\s*airport)\s*[:\-]?\s*([\d.]+\s*(?:km|mins?|min))/i,
    /([\d.]+\s*(?:km|mins?))\s*(?:from|to)\s*(?:the\s+)?(?:chandigarh\s+)?(?:international\s+)?airport/i,
  ]);
  if (dist?.[1] && !adj) {
    set("airportDistance", dist[1].trim(), 86, dist[0]);
    if (/chandigarh/i.test(dist[0]) || /chandigarh/i.test(text)) {
      set("nearbyAirport", "Chandigarh International Airport", 80, dist[0]);
    } else {
      set("nearbyAirport", "Airport", 70, dist[0]);
    }
    set("investmentAdvantage", "Airport Connectivity", 78, dist[0]);
  } else if (/\b(?:chandigarh\s+)?(?:international\s+)?airport\b/i.test(text) && !adj) {
    const nameMatch = text.match(/([A-Za-z]+(?:\s+[A-Za-z]+)?\s+International\s+Airport)/i);
    set(
      "nearbyAirport",
      nameMatch?.[1] || "Chandigarh International Airport",
      72,
      nameMatch?.[0],
    );
  }
}

function extractRoadSemantics(text: string, set: SetFn) {
  // "Upcoming 164 ft Cargo Road"
  const upcomingNamed = firstMatch(text, [
    /(upcoming|proposed|planned|new)\s+(\d+)\s*(ft|feet|m|meter|metre)\s+([A-Za-z][A-Za-z0-9 .'-]{1,40}?road)/i,
  ]);
  if (upcomingNamed) {
    set("roadStatus", titleCase(upcomingNamed[1]), 93, upcomingNamed[0]);
    set("roadWidth", `${upcomingNamed[2]} ${upcomingNamed[3].toLowerCase() === "feet" ? "ft" : upcomingNamed[3]}`, 95, upcomingNamed[0]);
    const roadName = upcomingNamed[4].replace(/\s+/g, " ").trim();
    set("roadName", roadName.replace(/\b\w/g, (c) => c.toUpperCase()), 92, upcomingNamed[0]);
    if (/cargo/i.test(roadName)) {
      set("connectivityAdvantage", "Cargo Corridor", 91, upcomingNamed[0]);
    } else {
      set("connectivityAdvantage", `${roadName} Connectivity`, 80, upcomingNamed[0]);
    }
  }

  // "Direct Connectivity via 82 ft Road"
  const directVia = firstMatch(text, [
    /(direct)\s+connectivity\s+(?:via|through|on)\s+(\d+)\s*(ft|feet)\s*(?:wide\s*)?road/i,
    /(?:via|through)\s+(\d+)\s*(ft|feet)\s*(?:wide\s*)?road/i,
  ]);
  if (directVia) {
    if (/direct/i.test(directVia[0])) {
      set("connectivity", "Direct", 94, directVia[0]);
    }
    const w = directVia[2] && /^\d+$/.test(directVia[2]) ? directVia[2] : directVia[1];
    const unit = directVia[3] || directVia[2];
    if (w && /^\d+$/.test(w)) {
      set("roadWidth", `${w} ${/feet/i.test(unit || "") ? "ft" : unit || "ft"}`, 93, directVia[0]);
    }
  }

  // Generic: "164 ft wide road" / "82 ft Road"
  if (!upcomingNamed) {
    const generic = firstMatch(text, [
      /(\d+)\s*(ft|feet)\s*(?:wide\s*)?(?:[A-Za-z][A-Za-z0-9 .'-]{0,30}?)?road/i,
      /road\s*(?:width)?\s*[:\-]?\s*(\d+)\s*(ft|feet)/i,
    ]);
    if (generic) {
      const num = generic[1];
      const unit = generic[2] || "ft";
      if (/^\d+$/.test(num)) {
        set("roadWidth", `${num} ${/feet/i.test(unit) ? "ft" : unit}`, 88, generic[0]);
      }
      const named = generic[0].match(/\d+\s*(?:ft|feet)\s+([A-Za-z][A-Za-z0-9 .'-]*road)/i);
      if (named?.[1]) {
        set("roadName", named[1].replace(/\b\w/g, (c) => c.toUpperCase()), 85, generic[0]);
        if (/cargo/i.test(named[1])) set("connectivityAdvantage", "Cargo Corridor", 88, generic[0]);
      }
    }
  }

  if (/\bdirect\s+connectivity\b/i.test(text)) {
    set("connectivity", "Direct", 90);
  }
}

function extractLandmarkSemantics(text: string, set: SetFn) {
  // "Adjoining Aerotropolis Block A"
  const adjLandmark = firstMatch(text, [
    /(?:adjoining|adjacent\s+to|next\s+to|beside|abutting)\s+([A-Z][A-Za-z0-9 .'-]{2,50})/i,
  ]);
  if (adjLandmark?.[1]) {
    const name = adjLandmark[1].replace(/\s+/g, " ").trim();
    // Skip if it's an airport (handled separately)
    if (!/airport/i.test(name)) {
      set("nearbyLandmark", name, 90, adjLandmark[0]);
      set("landmark", name, 88, adjLandmark[0]);
      if (/aerotropolis|aerocity|township|smart\s*city/i.test(name)) {
        set("areaType", "Future Ready Township", 87, adjLandmark[0]);
      }
    }
  }

  if (/\baerotropolis\b/i.test(text) && !adjLandmark) {
    const block = text.match(/aerotropolis(?:\s+block\s+[A-Z0-9]+)?/i);
    if (block) {
      set("nearbyLandmark", titleCase(block[0]), 82, block[0]);
      set("areaType", "Future Ready Township", 84, block[0]);
    }
  }

  if (/\bfuture[\s-]?ready\b|\btownship\b|\baerocity\b/i.test(text)) {
    set("areaType", "Future Ready Township", 80);
  }
}

function extractReraSemantics(text: string, set: SetFn) {
  if (/\brera\s*approved\b|\bapproved\s*by\s*rera\b|\brera\s*registered\b/i.test(text)) {
    const snip = text.match(/rera\s*approved|approved\s*by\s*rera|rera\s*registered/i)?.[0];
    set("reraStatus", "Approved", 96, snip);
    set("projectTrustScore", "High", 90, snip);
  }

  const reraNo = firstMatch(text, [
    /(?:rera|RERA)\s*(?:no\.?|number|#)?\s*[:\-]?\s*([A-Z0-9\-\/]{4,})/i,
  ]);
  if (reraNo?.[1] && !/approved|registered/i.test(reraNo[1])) {
    set("rera", reraNo[1], 94, reraNo[0]);
    if (!/\brera\s*approved\b/i.test(text)) {
      set("reraStatus", "Registered", 85, reraNo[0]);
      set("projectTrustScore", "High", 82, reraNo[0]);
    }
  }
}

function extractProductSemantics(text: string, set: SetFn) {
  // "Premium Residential Plots"
  const premiumPlots = firstMatch(text, [
    /(premium|luxury|ultra[\s-]?luxury|affordable)\s+(residential\s+plots?|commercial\s+plots?|plots?|apartments?|flats?|villas?|sco\s*plots?)/i,
  ]);
  if (premiumPlots) {
    set("segment", titleCase(premiumPlots[1]), 93, premiumPlots[0]);
    const product = premiumPlots[2].replace(/\s+/g, " ").trim();
    if (/residential\s+plot/i.test(product)) set("propertyType", "Residential Plot", 95, premiumPlots[0]);
    else if (/commercial\s+plot/i.test(product)) set("propertyType", "Commercial Plot", 93, premiumPlots[0]);
    else if (/plot/i.test(product)) set("propertyType", "Residential Plot", 88, premiumPlots[0]);
    else if (/villa/i.test(product)) set("propertyType", "Villa", 90, premiumPlots[0]);
    else if (/apartment|flat/i.test(product)) set("propertyType", "Apartment", 90, premiumPlots[0]);
    else if (/sco/i.test(product)) set("propertyType", "SCO", 90, premiumPlots[0]);
  } else {
    if (/\bpremium\b/i.test(text)) set("segment", "Premium", 78);
    if (/\bluxury\b/i.test(text)) set("segment", "Luxury", 80);
    if (/\bresidential\s+plots?\b/i.test(text)) set("propertyType", "Residential Plot", 90);
    else if (/\bplots?\b/i.test(text) && !/\bapartment|bhk|flat\b/i.test(text)) {
      set("propertyType", "Residential Plot", 82);
    } else if (/\b\d\s*BHK\b|\bapartment|\bflat\b/i.test(text)) {
      set("propertyType", "Apartment", 84);
    } else if (/\bvilla\b/i.test(text)) set("propertyType", "Villa", 84);
    else if (/\bsco\b/i.test(text)) set("propertyType", "SCO", 86);
  }

  const config = firstMatch(text, [
    /(\d\s*(?:\+?\s*\d)?\s*BHK)/i,
    /(studio|penthouse|duplex)/i,
  ]);
  if (config?.[1]) set("configuration", config[1].replace(/\s+/g, " "), 90, config[0]);
}

function extractPricingSemantics(text: string, set: SetFn) {
  // "Current Rate ₹92,000 per Sq Yard"
  const perYard = firstMatch(text, [
    /(?:current\s*rate|rate|price|@)\s*[:\-]?\s*(?:₹|rs\.?\s*)?\s*([\d,]+)\s*(?:per|\/)\s*(?:sq\.?\s*)?(?:yard|yd|yds)\b/i,
    /(?:₹|rs\.?\s*)([\d,]+)\s*(?:per|\/)\s*(?:sq\.?\s*)?(?:yard|yd|yds)\b/i,
  ]);
  if (perYard?.[1]) {
    set("pricePerYard", perYard[1].replace(/,/g, ""), 96, perYard[0]);
    set("currency", "INR", 98, perYard[0]);
  }

  const perSqft = firstMatch(text, [
    /(?:₹|rs\.?\s*)([\d,]+)\s*(?:per|\/)\s*(?:sq\.?\s*ft|sqft)\b/i,
  ]);
  if (perSqft?.[1]) {
    set("pricePerSqFt", perSqft[1].replace(/,/g, ""), 94, perSqft[0]);
    set("currency", "INR", 98, perSqft[0]);
  }

  const priceRaw = firstMatch(text, [
    /(?:starting\s*(?:from|at)|price|@)\s*[:\-]?\s*(₹?\s*[\d.,]+\s*(?:cr|crore|lakh|lac|l)?)/i,
    /(₹\s*[\d.,]+\s*(?:cr|crore|lakh|lac)?)/i,
  ]);
  if (priceRaw?.[1] || priceRaw?.[0]) {
    const raw = (priceRaw[1] || priceRaw[0]).trim();
    if (!/per\s*sq|\/\s*sq|per\s*yard|per\s*acre/i.test(priceRaw[0])) {
      set("priceRange", raw, 85, priceRaw[0]);
      const num = parseIndianPriceToNumber(raw);
      if (num) {
        set("price", num, 82, priceRaw[0]);
        set("totalPrice", num, 82, priceRaw[0]);
      }
      if (/₹|rs\.?/i.test(priceRaw[0])) set("currency", "INR", 95, priceRaw[0]);
    }
  }

  const perAcre = firstMatch(text, [
    /(?:₹|rs\.?\s*)?\s*([\d.,]+\s*(?:cr|crore|lakh|lac)?)\s*(?:per|\/)\s*acre\b/i,
  ]);
  if (perAcre?.[1]) {
    const num = parseIndianPriceToNumber(perAcre[1]);
    if (num) set("pricePerAcre", num, 92, perAcre[0]);
    set("currency", "INR", 98, perAcre[0]);
  }

  if (/₹|rs\.?/i.test(text)) set("currency", "INR", 90);
}

function extractInvestmentSemantics(text: string, set: SetFn) {
  if (/\bideal\s+for\s+investment\b|\bgreat\s+for\s+investment\b|\binvestment\s+opportunity\b/i.test(text)) {
    const snip = text.match(/ideal\s+for\s+investment|great\s+for\s+investment|investment\s+opportunity/i)?.[0];
    set("suitableFor", "Investment", 94, snip);
    set("investorScore", "High", 88, snip);
  } else if (/\bfor\s+investment\b|\binvestors?\b/i.test(text)) {
    set("suitableFor", "Investment", 82);
    set("investorScore", "High", 75);
  }

  if (/\bend[\s-]?use\b|\bself[\s-]?use\b|\bend\s*user\b/i.test(text)) {
    set("suitableFor", fieldsMergeSuitable(text), 80);
  }

  if (/\bhigh\s+appreciation\b|\bappreciation\s+potential\b/i.test(text)) {
    set("investmentAdvantage", mergeAdvantage(text, "High Appreciation Potential"), 84);
  }
}

function fieldsMergeSuitable(text: string): string {
  const parts: string[] = [];
  if (/\binvest/i.test(text)) parts.push("Investment");
  if (/\bend[\s-]?use|self[\s-]?use|end\s*user/i.test(text)) parts.push("End Use");
  return parts.join(" + ") || "Investment";
}

function mergeAdvantage(text: string, fallback: string): string {
  if (/\bairport\b/i.test(text)) return "Airport Connectivity";
  if (/\bcargo\b/i.test(text)) return "Cargo Corridor";
  return fallback;
}

function titleCase(value: string): string {
  return value.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function assembleDescriptions(fields: ExtractedListingFields, confidence: FieldConfidenceMap) {
  const highlights: string[] = [];
  if (fields.nearbyAirport) {
    highlights.push(
      `${fields.airportProximity || "Near"} ${fields.nearbyAirport}`.trim(),
    );
  }
  if (fields.roadWidth) {
    const roadBits = [fields.roadStatus, fields.roadWidth, fields.roadName].filter(Boolean).join(" ");
    highlights.push(roadBits);
  }
  if (fields.connectivity) highlights.push(`${fields.connectivity} connectivity`);
  if (fields.nearbyLandmark) highlights.push(`Adjoining ${fields.nearbyLandmark}`);
  if (fields.reraStatus) highlights.push(`RERA ${fields.reraStatus}`);
  if (fields.segment && fields.propertyType) {
    highlights.push(`${fields.segment} ${fields.propertyType}`);
  }
  if (fields.pricePerYard) highlights.push(`₹${Number(fields.pricePerYard).toLocaleString("en-IN")}/sq yd`);
  if (fields.suitableFor) highlights.push(`Ideal for ${fields.suitableFor}`);

  fields.investmentHighlights = [
    fields.investmentAdvantage,
    fields.connectivityAdvantage,
    fields.investorScore ? `Investor score: ${fields.investorScore}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  fields.buyerHighlights = highlights.slice(0, 6).join(" · ");
  fields.shortDescription = [
    fields.projectName,
    fields.segment,
    fields.propertyType || fields.configuration,
    fields.location || fields.city,
  ]
    .filter(Boolean)
    .join(" — ");

  fields.longDescription = highlights.length
    ? `${fields.shortDescription ? `${fields.shortDescription}. ` : ""}${highlights.join(". ")}.`
    : fields.shortDescription;

  fields.description = fields.shortDescription || fields.longDescription.slice(0, 220);
  fields.keywords = [
    fields.projectName,
    fields.builder,
    fields.city,
    fields.propertyType,
    fields.segment,
    fields.nearbyAirport,
    fields.roadName,
    fields.suitableFor,
    "AreaIQ",
  ]
    .filter(Boolean)
    .join(", ");

  if (fields.shortDescription) confidence.shortDescription = 85;
  if (fields.longDescription) confidence.longDescription = 82;
  if (fields.description) confidence.description = 84;
  if (fields.investmentHighlights) confidence.investmentHighlights = 88;
  if (fields.buyerHighlights) confidence.buyerHighlights = 86;
  if (fields.keywords) confidence.keywords = 80;
}

export function buildBrainFacts(
  fields: ExtractedListingFields,
  confidence: FieldConfidenceMap,
  snippets: Record<string, string> = {},
): BrainFact[] {
  const facts: BrainFact[] = [];
  const skip = new Set([
    "description",
    "shortDescription",
    "longDescription",
    "amenities",
    "googleMapsUrl",
    "lat",
    "lng",
    "youtube",
  ]);

  for (const [key, raw] of Object.entries(fields)) {
    if (skip.has(key)) continue;
    if (key === "amenities") continue;
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) continue;
    const meta = FIELD_META[key] || { label: key, category: "other" as const };
    facts.push({
      key,
      label: meta.label,
      value,
      confidence: confidence[key] || 60,
      category: meta.category,
      sourceSnippet: snippets[key],
    });
  }

  if (fields.amenities.length) {
    facts.push({
      key: "amenities",
      label: "Amenities",
      value: fields.amenities.join(", "),
      confidence: confidence.amenities || 80,
      category: "amenities",
    });
  }

  return facts;
}

export function buildSemanticSearchText(facts: BrainFact[], fields: ExtractedListingFields): string {
  const lines = facts.map((f) => `${f.label}: ${f.value}`);
  if (fields.amenities.length) lines.push(`Amenities: ${fields.amenities.join(", ")}`);
  return lines.join("\n");
}

export function structuredFieldsFromExtraction(
  fields: ExtractedListingFields,
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (key === "amenities") {
      if (fields.amenities.length) out.amenities = [...fields.amenities];
      continue;
    }
    if (typeof value === "string" && value.trim()) out[key] = value.trim();
  }
  return out;
}

export function semanticExtractFromText(
  text: string,
  extras?: {
    googleMapsUrl?: string;
    lat?: string;
    lng?: string;
    documents?: StudioDocumentRef[];
  },
): {
  fields: ExtractedListingFields;
  confidence: FieldConfidenceMap;
  snippets: Record<string, string>;
} {
  const fields = emptyExtractedListingFields();
  const confidence: FieldConfidenceMap = {};
  const snippets: Record<string, string> = {};

  const set: SetFn = (key, value, conf, snippet) => {
    if (!value) return;
    if (key === "amenities") return;
    // Prefer higher confidence when overwriting
    const prev = confidence[key] || 0;
    if (fields[key] && prev > conf) return;
    fields[key] = value;
    confidence[key] = conf;
    if (snippet) snippets[key] = snippet.slice(0, 160);
  };

  const trimmed = text.trim();
  if (!trimmed) {
    if (extras?.googleMapsUrl) set("googleMapsUrl", extras.googleMapsUrl, 90);
    if (extras?.lat) set("lat", extras.lat, 95);
    if (extras?.lng) set("lng", extras.lng, 95);
    return { fields, confidence, snippets };
  }

  // --- Expert semantic passes (order matters for overwrite rules) ---
  extractAirportSemantics(trimmed, set);
  extractRoadSemantics(trimmed, set);
  extractLandmarkSemantics(trimmed, set);
  extractReraSemantics(trimmed, set);
  extractProductSemantics(trimmed, set);
  extractPricingSemantics(trimmed, set);
  extractInvestmentSemantics(trimmed, set);

  // Identity
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const firstLine = lines[0] || "";
  const project =
    firstMatch(trimmed, [
      /(?:project|launching|introducing|presents?)\s*[:\-]?\s*([A-Z][A-Za-z0-9 &.'-]{2,60})/i,
    ])?.[1] ||
    (firstLine.length < 60 && !/http|₹|rs\.?|right\s+next|upcoming|direct|adjoining|rera|premium|ideal|current\s*rate/i.test(firstLine)
      ? firstLine.replace(/[*_~]/g, "")
      : "");
  if (project) set("projectName", project, 78, project);

  const builder = firstMatch(trimmed, [
    /(?:builder|developer|by)\s*[:\-]?\s*([A-Za-z0-9 &.'-]{2,50})/i,
  ]);
  if (builder?.[1]) {
    set("builder", builder[1].trim(), 84, builder[0]);
    set("developer", builder[1].trim(), 78, builder[0]);
  }

  const plotParsed = extractPlotSizeFromText(trimmed);
  if (plotParsed.minPlotSize) {
    set("minPlotSize", plotParsed.minPlotSize, 94, plotParsed.plotSizes);
    if (plotParsed.maxPlotSize) set("maxPlotSize", plotParsed.maxPlotSize, 94, plotParsed.plotSizes);
    if (plotParsed.plotSizeUnit) set("plotSizeUnit", plotParsed.plotSizeUnit, 92, plotParsed.plotSizes);
    set("plotSizes", plotParsed.plotSizes, 94, plotParsed.plotSizes);
  }

  const aptSize = firstMatch(trimmed, [
    /(?:super\s*area|built[\s-]*up|carpet)\s*[:\-]?\s*([\d,]+\s*(?:sq\.?\s*ft)?)/i,
  ]);
  if (aptSize?.[1]) set("apartmentSizes", aptSize[1].trim(), 80, aptSize[0]);

  const possession = firstMatch(trimmed, [
    /(?:possession|rera\s*possession|delivery)\s*[:\-]?\s*([A-Za-z]+\s*\d{4}|\d{1,2}[\/\-]\d{4}|Q[1-4]\s*\d{4}|ready\s*to\s*move)/i,
  ]);
  if (possession?.[1]) {
    set("possession", possession[1].trim(), 86, possession[0]);
    set(
      "launchStatus",
      /ready/i.test(possession[1]) ? "Ready To Move" : "Under Construction",
      /ready/i.test(possession[1]) ? 88 : 76,
      possession[0],
    );
  }
  if (/ready\s*to\s*move/i.test(trimmed) && !fields.launchStatus) {
    set("launchStatus", "Ready To Move", 90);
  } else if (/under\s*construction|new\s*launch|pre[\s-]?launch/i.test(trimmed) && !fields.launchStatus) {
    set("launchStatus", "Under Construction", 84);
  }

  const facing = firstMatch(trimmed, [
    /(north|south|east|west|north[\s-]?east|north[\s-]?west|south[\s-]?east|south[\s-]?west)\s*facing/i,
  ]);
  if (facing?.[1]) set("facing", facing[1].replace(/\s+/g, " "), 88, facing[0]);

  const phone = firstMatch(trimmed, [/(?:\+91[\s-]*)?([6-9]\d{9})\b/]);
  if (phone?.[1]) set("phone", phone[1], 92, phone[0]);

  const email = firstMatch(trimmed, [/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/]);
  if (email?.[1]) set("email", email[1], 96, email[0]);

  const website = firstMatch(trimmed, [/(https?:\/\/[^\s]+)/i]);
  if (website?.[1] && !/maps\.google|goo\.gl\/maps|maps\.app/i.test(website[1])) {
    set("website", website[1], 72, website[0]);
  }

  const maps = firstMatch(trimmed, [
    /(https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google)[^\s]+)/i,
  ]);
  if (maps?.[1]) set("googleMapsUrl", maps[1], 90, maps[0]);
  else if (extras?.googleMapsUrl) set("googleMapsUrl", extras.googleMapsUrl, 90);

  const city = firstMatch(trimmed, [
    /\b(Mohali|Zirakpur|Dhakoli|Peer Muchalla|Peermuchalla|Chandigarh|Kharar|Panchkula Extension [12]|Panchkula Ext\.? [12]|Amravati Enclave|Amravati|Panchkula|New Chandigarh|Aerocity|Banur|Derabassi|Ludhiana|Ambala)\b/i,
  ]);
  if (city?.[1]) set("city", city[1], 88, city[0]);

  const sector = firstMatch(trimmed, [/\b(?:Sector|Sec\.?)\s*([A-Z0-9\-]+)/i]);
  if (sector?.[1]) set("sector", `Sector ${sector[1]}`, 84, sector[0]);

  if (!fields.location) {
    const loc = [fields.sector, fields.locality, fields.city].filter(Boolean).join(", ");
    if (loc) set("location", loc, 70);
  }

  const metro = firstMatch(trimmed, [/(?:metro)\s*[:\-]?\s*([\d.]+\s*(?:km|mins?|min))/i]);
  if (metro?.[1]) set("metroDistance", metro[1], 78, metro[0]);

  const hospital = firstMatch(trimmed, [/(?:hospital)\s*[:\-]?\s*([\d.]+\s*(?:km|mins?|min))/i]);
  if (hospital?.[1]) set("hospitalDistance", hospital[1], 76, hospital[0]);

  const school = firstMatch(trimmed, [/(?:school)\s*[:\-]?\s*([\d.]+\s*(?:km|mins?|min))/i]);
  if (school?.[1]) set("schoolDistance", school[1], 76, school[0]);

  const mall = firstMatch(trimmed, [/(?:mall)\s*[:\-]?\s*([\d.]+\s*(?:km|mins?|min))/i]);
  if (mall?.[1]) set("mallDistance", mall[1], 76, mall[0]);

  const highway = firstMatch(trimmed, [
    /(?:highway|nh[\s-]?\d+|expressway)(?:\s*[:\-]?\s*([\d.]+\s*(?:km|mins?|min)))?/i,
  ]);
  if (highway) set("highwayDistance", highway[1]?.trim() || "Nearby", 74, highway[0]);

  const payment = firstMatch(trimmed, [
    /(?:payment\s*plan|clp|construction\s*linked)[:\-]?\s*([^\n.]{5,80})/i,
  ]);
  if (payment?.[1]) set("paymentPlan", payment[1].trim(), 80, payment[0]);

  for (const { pattern, amenity, flag } of AMENITY_MAP) {
    if (pattern.test(trimmed) && !fields.amenities.includes(amenity)) {
      fields.amenities.push(amenity);
      if (flag) set(flag, "Yes", 88);
    }
  }
  if (fields.amenities.length) confidence.amenities = 86;

  if (/rent|lease/i.test(trimmed)) set("listingType", "rent", 75);
  else set("listingType", "buy", 65);

  // Descriptions assembled from structured facts (not raw WhatsApp dump)
  assembleDescriptions(fields, confidence);

  if (extras?.lat) set("lat", extras.lat, 95);
  if (extras?.lng) set("lng", extras.lng, 95);

  // Document filename signals
  const docs = classifyDocuments(extras?.documents ?? []);
  for (const doc of docs) {
    if (doc.category === "rera" && !fields.reraStatus) {
      set("reraStatus", "Document Attached", 70, doc.name);
    }
    if (doc.category === "brochure" && !fields.keywords.includes("Brochure")) {
      fields.keywords = [fields.keywords, "Brochure"].filter(Boolean).join(", ");
    }
  }

  return { fields, confidence, snippets };
}

/** @deprecated use semanticExtractFromText */
export function heuristicExtractFromWhatsApp(
  text: string,
  extras?: { googleMapsUrl?: string; lat?: string; lng?: string; documents?: StudioDocumentRef[] },
) {
  const { fields, confidence } = semanticExtractFromText(text, extras);
  return { fields, confidence };
}
