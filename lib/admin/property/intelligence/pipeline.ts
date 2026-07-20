import { isReraApproved } from "@/lib/properties/reraStatus";
import type { AdminPropertyFormState } from "../types";
import {
  AI_PIPELINE_VERSION,
  type AIAgentId,
  type AIAgentOutput,
  type PropertyAIIntelligence,
} from "./types";

function formatPrice(value: number): string {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(0)} L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function agentOutput(
  agentId: AIAgentId,
  outputs: Record<string, string | number | string[]>,
  confidence: number,
): AIAgentOutput {
  const now = new Date().toISOString();
  return {
    agentId,
    version: "1.0.0",
    generatedAt: now,
    confidence,
    outputs,
  };
}

function runPropertyIntelligenceAgent(form: AdminPropertyFormState, scores: Record<string, number>) {
  const price = parseFloat(form.price) || 0;
  const bedrooms = parseInt(form.bedrooms, 10) || 0;
  const config = form.basic.configuration || (bedrooms ? `${bedrooms} BHK` : form.sub_type.replace("_", " "));
  const locality = form.location || form.locationMeta.locality || form.sector;
  return agentOutput(
    "property_intelligence",
    {
      propertySummary: `${form.title} is a ${config} ${form.type === "rent" ? "rental" : "sale"} listing in ${locality}, ${form.city}.`,
      luxurySummary: form.amenities.length >= 8
        ? `Premium inventory with ${form.amenities.slice(0, 5).join(", ")} and high-spec finishes.`
        : `Well-positioned ${config} with curated amenities: ${form.amenities.slice(0, 4).join(", ") || "standard project amenities"}.`,
      buyerSummary: `Best suited for ${form.basic.purpose.replace("-", " ")} buyers seeking ${config} in ${form.city}.`,
    },
    scores.base,
  );
}

function runAreaIntelligenceAgent(form: AdminPropertyFormState, scores: Record<string, number>) {
  const locality = form.location || form.locationMeta.locality || form.sector;
  return agentOutput(
    "area_intelligence",
    {
      areaSummary: `${locality}, ${form.city} — ${form.locationMeta.areaCategory || "established micro-market"}. ${form.locationMeta.futureInfrastructure || ""}`.trim(),
      lifestyleSummary: `Daily conveniences within reach: schools ${form.locationMeta.schoolDistance || "nearby"}, hospitals ${form.locationMeta.hospitalDistance || "nearby"}, retail ${form.locationMeta.mallDistance || "accessible"}.`,
      futureGrowth: form.pricing.expectedAppreciation
        ? `Projected appreciation: ${form.pricing.expectedAppreciation}.`
        : `Growth score ${scores.growth}/100 based on infrastructure and amenity density.`,
    },
    scores.base,
  );
}

function runPricingAgent(form: AdminPropertyFormState, scores: Record<string, number>) {
  const price = parseFloat(form.price) || 0;
  const area = parseFloat(form.area_sqft) || parseFloat(form.specs.carpetArea) || 0;
  const ppsf = area > 0 ? Math.round(price / area) : parseFloat(form.pricing.pricePerSqft) || 0;
  return agentOutput(
    "pricing",
    {
      priceAnalysis: price > 0
        ? `Listed at ${formatPrice(price)}${ppsf ? ` (~₹${ppsf.toLocaleString("en-IN")}/sqft)` : ""}. ${form.pricing.hiddenCharges ? `Note: ${form.pricing.hiddenCharges}` : ""}`
        : "Pricing pending verification.",
      marketPosition: `Positioned in the ${form.basic.purpose} segment for ${form.city} with ${form.pricing.paymentPlan ? "structured payment plan" : "standard payment terms"}.`,
    },
    scores.base,
  );
}

function runBuilderIntelligenceAgent(form: AdminPropertyFormState, scores: Record<string, number>) {
  const builder = form.builder_name || form.basic.builder || "Developer";
  return agentOutput(
    "builder_intelligence",
    {
      builderReputationSummary: `${builder} — ${form.rera_number ? `RERA ${form.rera_number}.` : "Verify RERA registration."} Possession: ${form.possession || form.basic.propertyStatus || "confirm with builder"}.`,
    },
    form.rera_number ? scores.base + 5 : scores.base - 5,
  );
}

function runRentalIntelligenceAgent(form: AdminPropertyFormState, scores: Record<string, number>) {
  return agentOutput(
    "rental_intelligence",
    {
      rentalAnalysis: form.pricing.rentalEstimate
        ? `Estimated rental: ${form.pricing.rentalEstimate}. Yield ~${scores.rentalYield}%.`
        : `Estimated rental yield ${scores.rentalYield}% for ${form.city} ${form.sub_type.replace("_", " ")} inventory.`,
      rentalYield: `${scores.rentalYield}%`,
    },
    scores.base,
  );
}

function runInvestmentAgent(form: AdminPropertyFormState, scores: Record<string, number>) {
  return agentOutput(
    "investment",
    {
      investmentSummary: `Investment grade ${scores.investment}/100 with growth score ${scores.growth}/100 and demand index ${scores.demand}/100.`,
      investmentScore: scores.investment,
      growthScore: scores.growth,
      demandIndex: scores.demand,
      capitalAppreciation: form.pricing.expectedAppreciation || `${Math.round(scores.growth / 10)}% over 3–5 years (estimate)`,
      aiRecommendation: scores.investment >= 75
        ? "Strong buy for long-term holders — monitor possession milestones."
        : scores.investment >= 55
          ? "Suitable for diversified portfolio — negotiate payment terms."
          : "Evaluate alternatives — niche buyer profile recommended.",
    },
    scores.base,
  );
}

function runSeoAgent(form: AdminPropertyFormState) {
  const slug = form.seo.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return agentOutput(
    "seo",
    {
      metaTitle: `${form.title} in ${form.city} | AreaIQ`,
      metaDescription: `${form.title} — ${form.basic.configuration || form.sub_type.replace("_", " ")} in ${form.location || form.city}. AI-verified listing on AreaIQ.`,
      keywords: [form.city, form.sector, form.basic.builder, form.sub_type, `${form.bedrooms} bhk`].filter(Boolean).join(", "),
      schemaJson: JSON.stringify({
        "@type": "RealEstateListing",
        name: form.title,
        address: form.location,
        price: parseFloat(form.price) || undefined,
      }),
      slug,
    },
    88,
  );
}

function runPhotoVisionAgent(form: AdminPropertyFormState) {
  const count = form.photos.length;
  return agentOutput(
    "photo_vision",
    {
      visualHighlights: count > 0
        ? `${count} photos uploaded — gallery ready for premium buyer presentation.`
        : "No photos yet — upload images to enable visual intelligence.",
      furnishingQuality: form.furnishing || "To be assessed from media",
    },
    count >= 3 ? 85 : count > 0 ? 70 : 40,
  );
}

function runDocumentIntelligenceAgent(form: AdminPropertyFormState) {
  const docs = [form.documents.brochure, form.documents.pdf, form.documents.masterPlan, ...form.documents.floorPlans].filter(Boolean);
  return agentOutput(
    "document_intelligence",
    {
      extractedSummary: docs.length > 0
        ? `${docs.length} document(s) on file — brochure and plans available for buyer download.`
        : "Upload brochure/floor plans to enrich buyer trust.",
    },
    docs.length > 0 ? 82 : 50,
  );
}

function runMapIntelligenceAgent(form: AdminPropertyFormState) {
  const points = [
    form.locationMeta.airportDistance && `Airport ${form.locationMeta.airportDistance}`,
    form.locationMeta.schoolDistance && `Schools ${form.locationMeta.schoolDistance}`,
    form.locationMeta.hospitalDistance && `Hospitals ${form.locationMeta.hospitalDistance}`,
    form.locationMeta.mallDistance && `Malls ${form.locationMeta.mallDistance}`,
    form.locationMeta.upcomingMetro && `Metro ${form.locationMeta.upcomingMetro}`,
    form.locationMeta.itParkDistance && `IT hub ${form.locationMeta.itParkDistance}`,
  ].filter(Boolean);
  return agentOutput(
    "map_intelligence",
    {
      connectivityReview: points.length > 0 ? points.join(" · ") : `Located in ${form.location || form.city}. Add coordinates for commute analysis.`,
      nearbyFacilitiesSummary: points.join(". ") || "Add distance fields to enable connectivity intelligence.",
    },
    form.lat && form.lng ? 86 : 62,
  );
}

function runMarketIntelligenceAgent(form: AdminPropertyFormState, scores: Record<string, number>) {
  return agentOutput(
    "market_intelligence",
    {
      marketPosition: `Demand index ${scores.demand}/100 in ${form.sector || form.city}.`,
      comparableProperties: `Compare with active ${form.sub_type.replace("_", " ")} listings in ${form.sector || form.city}.`,
    },
    scores.base,
  );
}

function runQualityReviewAgent(
  form: AdminPropertyFormState,
  agents: Partial<Record<AIAgentId, AIAgentOutput>>,
) {
  const missing: string[] = [];
  if (!form.title) missing.push("title");
  if (!form.price) missing.push("price");
  if (!form.location) missing.push("location");
  if (form.photos.length === 0) missing.push("photos");
  if (!form.rera_number) missing.push("rera");
  const agentCount = Object.keys(agents).length;
  return agentOutput(
    "quality_review",
    {
      reviewStatus: missing.length === 0 ? "Ready for publishing" : `Missing: ${missing.join(", ")}`,
      agentsRun: agentCount,
      flags: missing,
    },
    missing.length === 0 ? 92 : Math.max(45, 92 - missing.length * 8),
  );
}

function computeScores(form: AdminPropertyFormState) {
  const amenityBoost = Math.min(form.amenities.length * 2, 14);
  const geoBoost = form.lat && form.lng ? 6 : 0;
  const reraBoost = form.rera_number ? 5 : 0;
  const base = 58 + amenityBoost + geoBoost + reraBoost;
  const growth = Math.min(95, base + 4);
  const demand = Math.min(92, base + 8);
  const investment = Math.min(90, base + 6);
  const rentalYield = Math.min(5.5, 2.8 + amenityBoost / 10);
  return { base, growth, demand, investment, rentalYield: Math.round(rentalYield * 10) / 10 };
}

function compileOutputs(
  agents: Partial<Record<AIAgentId, AIAgentOutput>>,
  form: AdminPropertyFormState,
): Record<string, string> {
  const get = (agent: AIAgentId, key: string): string => {
    const val = agents[agent]?.outputs[key];
    if (val == null) return "";
    return Array.isArray(val) ? val.join("\n") : String(val);
  };

  const investment = agents.investment?.outputs;
  const pros = [
    `Prime location in ${get("area_intelligence", "areaSummary").split("—")[0] || "the area"}`,
    isReraApproved({ rera_number: form.rera_number }) ? "RERA registered" : null,
    get("photo_vision", "visualHighlights"),
  ].filter(Boolean);

  const cons = [
    "Verify possession timeline with builder",
    "Compare pricing with nearby listings",
  ];

  return {
    propertySummary: get("property_intelligence", "propertySummary"),
    luxurySummary: get("property_intelligence", "luxurySummary"),
    buyerSummary: get("property_intelligence", "buyerSummary"),
    investmentSummary: get("investment", "investmentSummary"),
    rentalAnalysis: get("rental_intelligence", "rentalAnalysis"),
    capitalAppreciation: get("investment", "capitalAppreciation"),
    pros: pros.map((p) => `• ${p}`).join("\n"),
    cons: cons.map((c) => `• ${c}`).join("\n"),
    bestBuyerPersona: get("property_intelligence", "buyerSummary"),
    marketPosition: get("market_intelligence", "marketPosition"),
    connectivityReview: get("map_intelligence", "connectivityReview"),
    nearbyFacilitiesSummary: get("map_intelligence", "nearbyFacilitiesSummary"),
    builderReputationSummary: get("builder_intelligence", "builderReputationSummary"),
    lifestyleSummary: get("area_intelligence", "lifestyleSummary"),
    areaSummary: get("area_intelligence", "areaSummary"),
    riskAnalysis: investment && Number(investment.investmentScore) < 55
      ? "Moderate risk — complete due diligence on pricing and delivery."
      : "Standard due diligence recommended before booking.",
    priceAnalysis: get("pricing", "priceAnalysis"),
    comparableProperties: get("market_intelligence", "comparableProperties"),
    futureGrowth: get("area_intelligence", "futureGrowth"),
    demandIndex: String(investment?.demandIndex ?? ""),
    investmentScore: String(investment?.investmentScore ?? ""),
    growthScore: String(investment?.growthScore ?? ""),
    rentalYield: get("rental_intelligence", "rentalYield"),
    aiRecommendation: get("investment", "aiRecommendation"),
    metaTitle: get("seo", "metaTitle"),
    metaDescription: get("seo", "metaDescription"),
    keywords: get("seo", "keywords"),
    schemaJson: get("seo", "schemaJson"),
  };
}

export function runPropertyIntelligencePipeline(form: AdminPropertyFormState): PropertyAIIntelligence {
  const scores = computeScores(form);
  const now = new Date().toISOString();

  const agents: Partial<Record<AIAgentId, AIAgentOutput>> = {
    property_intelligence: runPropertyIntelligenceAgent(form, scores),
    area_intelligence: runAreaIntelligenceAgent(form, scores),
    pricing: runPricingAgent(form, scores),
    builder_intelligence: runBuilderIntelligenceAgent(form, scores),
    rental_intelligence: runRentalIntelligenceAgent(form, scores),
    investment: runInvestmentAgent(form, scores),
    seo: runSeoAgent(form),
    photo_vision: runPhotoVisionAgent(form),
    document_intelligence: runDocumentIntelligenceAgent(form),
    map_intelligence: runMapIntelligenceAgent(form),
    market_intelligence: runMarketIntelligenceAgent(form, scores),
  };

  agents.quality_review = runQualityReviewAgent(form, agents);

  const confidences = Object.values(agents).map((a) => a?.confidence ?? 0);
  const confidence = Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length);

  return {
    pipelineVersion: AI_PIPELINE_VERSION,
    generatedAt: now,
    lastUpdated: now,
    confidence,
    agents,
    compiled: compileOutputs(agents, form),
  };
}

/** @deprecated use runPropertyIntelligencePipeline */
export function generatePropertyAIInsights(form: AdminPropertyFormState): Record<string, string> {
  return runPropertyIntelligencePipeline(form).compiled;
}

export function autoFillInsightInputs(form: AdminPropertyFormState): AdminPropertyFormState {
  return { ...form, aiIntelligence: runPropertyIntelligencePipeline(form) };
}