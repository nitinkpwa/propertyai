import "server-only";
import { getOpenAIClient, isOpenAIConfigured, OPENAI_MODEL } from "@/lib/ask/openai-client";
import { emptyExtractedListingFields, type ExtractedListingFields, type FieldConfidenceMap } from "./types";
import { semanticExtractFromText } from "./semanticExtract";

const EXPERT_SYSTEM = `You are a senior Indian real estate intelligence analyst for AreaIQ.

Your job is SEMANTIC EXTRACTION — decompose marketing prose into structured facts the way an expert underwriter would.

CRITICAL RULES:
1. NEVER leave useful information only inside description text. Every claim must become a structured field.
2. Do NOT invent prices, RERA numbers, builders, or distances not supported by the source.
3. Infer expert labels from language (e.g. "Right Next to X Airport" → nearbyAirport=X, airportProximity=Adjacent, investmentAdvantage=Airport Connectivity).
4. Return confidence 0-100 per field.
5. Descriptions must be assembled FROM structured facts, not a copy-paste of the WhatsApp blast.
6. Plot size RANGES must stay ranges: "100 to 150 Sq Yard" → minPlotSize=100, maxPlotSize=150, plotSizeUnit=Sq Yard. NEVER concatenate into 100150.
7. Store price units separately: pricePerSqFt, pricePerYard (sq yd), pricePerAcre, totalPrice. Never mix units into one field.

EXAMPLES OF REQUIRED DECOMPOSITION:
- "Right Next to Chandigarh International Airport"
  → nearbyAirport: Chandigarh International Airport
  → airportProximity: Adjacent
  → investmentAdvantage: Airport Connectivity
- "Upcoming 164 ft Cargo Road"
  → roadWidth: 164 ft, roadName: Cargo Road, roadStatus: Upcoming, connectivityAdvantage: Cargo Corridor
- "Direct Connectivity via 82 ft Road"
  → roadWidth: 82 ft, connectivity: Direct
- "Adjoining Aerotropolis Block A"
  → nearbyLandmark: Aerotropolis Block A, areaType: Future Ready Township
- "RERA Approved"
  → reraStatus: Approved, projectTrustScore: High
- "Premium Residential Plots"
  → propertyType: Residential Plot, segment: Premium
- "Current Rate ₹92,000 per Sq Yard"
  → pricePerYard: 92000, currency: INR
- "Ideal for Investment"
  → suitableFor: Investment, investorScore: High`;

const EXTRACTION_SCHEMA_HINT = `Return ONLY valid JSON:
{
  "fields": {
    "projectName": "", "builder": "", "developer": "", "seller": "",
    "propertyType": "", "listingType": "buy|rent|commercial", "segment": "",
    "configuration": "", "plotSizes": "", "minPlotSize": "", "maxPlotSize": "", "plotSizeUnit": "Sq Yard|Sq Ft|Acre|",
    "apartmentSizes": "",
    "price": "", "totalPrice": "", "priceRange": "", "pricePerSqFt": "", "pricePerYard": "", "pricePerAcre": "", "currency": "INR",

    "paymentPlan": "", "possession": "", "launchStatus": "",
    "rera": "", "reraStatus": "", "projectTrustScore": "",
    "roadWidth": "", "roadName": "", "roadStatus": "",
    "connectivity": "", "connectivityAdvantage": "",
    "facing": "", "location": "", "city": "", "sector": "", "locality": "",
    "landmark": "", "nearbyLandmark": "", "areaType": "",
    "nearbyAirport": "", "airportProximity": "", "airportDistance": "",
    "metroDistance": "", "hospitalDistance": "", "schoolDistance": "",
    "mallDistance": "", "highwayDistance": "", "investmentAdvantage": "",
    "suitableFor": "", "investorScore": "", "buyerPersona": "",
    "amenities": [], "clubHouse": "", "pool": "", "gym": "", "park": "",
    "security": "", "powerBackup": "", "water": "", "parking": "", "lift": "", "landscape": "",
    "description": "", "shortDescription": "", "longDescription": "",
    "investmentHighlights": "", "buyerHighlights": "", "keywords": "",
    "phone": "", "email": "", "website": "", "contactName": "", "youtube": "",
    "googleMapsUrl": "", "lat": "", "lng": ""
  },
  "confidence": { "fieldName": 0-100 },
  "evidence": { "fieldName": "short source phrase" }
}`;

function mergeFields(
  base: ExtractedListingFields,
  patch: Partial<ExtractedListingFields> | undefined,
): ExtractedListingFields {
  const out = { ...base, amenities: [...base.amenities] };
  if (!patch) return out;

  for (const [key, value] of Object.entries(patch)) {
    if (key === "amenities") {
      if (Array.isArray(value) && value.length) {
        out.amenities = value.filter((x): x is string => typeof x === "string");
      }
      continue;
    }
    if (typeof value === "string" && value.trim()) {
      (out as Record<string, string | string[]>)[key] = value.trim();
    }
  }
  return out;
}

export async function extractListingWithAI(input: {
  whatsappText: string;
  documentNames: string[];
  imageCount: number;
  googleMapsUrl?: string;
  lat?: string;
  lng?: string;
}): Promise<{
  fields: ExtractedListingFields;
  confidence: FieldConfidenceMap;
  usedAi: boolean;
  snippets: Record<string, string>;
}> {
  const semantic = semanticExtractFromText(input.whatsappText, {
    googleMapsUrl: input.googleMapsUrl,
    lat: input.lat,
    lng: input.lng,
  });

  if (!isOpenAIConfigured() || !input.whatsappText.trim()) {
    return {
      fields: semantic.fields,
      confidence: semantic.confidence,
      usedAi: false,
      snippets: semantic.snippets,
    };
  }

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.15,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXPERT_SYSTEM },
        {
          role: "user",
          content: `${EXTRACTION_SCHEMA_HINT}

SOURCE WhatsApp / marketing text:
"""
${input.whatsappText.slice(0, 10000)}
"""

Document filenames (use as weak signals only): ${input.documentNames.join(", ") || "(none)"}
Image count: ${input.imageCount}
Maps URL: ${input.googleMapsUrl || "(none)"}
Lat/Lng: ${input.lat || ""} / ${input.lng || ""}

Semantic seed already extracted (improve & fill gaps — do not invent; prefer richer structured fields):
${JSON.stringify({ fields: semantic.fields, confidence: semantic.confidence }, null, 0).slice(0, 6000)}

Extract EVERY structured signal. Assemble shortDescription/longDescription/investmentHighlights from facts only.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as {
      fields?: Partial<ExtractedListingFields>;
      confidence?: FieldConfidenceMap;
      evidence?: Record<string, string>;
    };

    const fields = mergeFields(semantic.fields, parsed.fields);
    // Ensure empty template keys exist
    const complete = { ...emptyExtractedListingFields(), ...fields, amenities: fields.amenities };

    const confidence: FieldConfidenceMap = {
      ...semantic.confidence,
      ...(parsed.confidence || {}),
    };

    const snippets: Record<string, string> = {
      ...semantic.snippets,
      ...(parsed.evidence || {}),
    };

    if (input.googleMapsUrl) {
      complete.googleMapsUrl = input.googleMapsUrl;
      confidence.googleMapsUrl = Math.max(confidence.googleMapsUrl || 0, 90);
    }
    if (input.lat) {
      complete.lat = input.lat;
      confidence.lat = 95;
    }
    if (input.lng) {
      complete.lng = input.lng;
      confidence.lng = 95;
    }

    // Prefer AI descriptions only if they don't dump raw source
    if (
      complete.longDescription &&
      input.whatsappText.length > 80 &&
      complete.longDescription.includes(input.whatsappText.slice(0, 80))
    ) {
      complete.longDescription = semantic.fields.longDescription;
      complete.shortDescription = semantic.fields.shortDescription || complete.shortDescription;
      complete.description = semantic.fields.description || complete.description;
    }

    return { fields: complete, confidence, usedAi: true, snippets };
  } catch (err) {
    console.error("extractListingWithAI fallback:", err);
    return {
      fields: semantic.fields,
      confidence: semantic.confidence,
      usedAi: false,
      snippets: semantic.snippets,
    };
  }
}
