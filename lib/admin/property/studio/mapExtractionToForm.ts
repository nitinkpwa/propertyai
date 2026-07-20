import { runPropertyIntelligencePipeline } from "@/lib/admin/property/intelligence/pipeline";
import { createEmptyAdminPropertyForm, type AdminPropertyFormState } from "../types";
import {
  buildBrainFacts,
  buildSemanticSearchText,
  structuredFieldsFromExtraction,
} from "./semanticExtract";
import type {
  BrainFact,
  ExtractedListingFields,
  FieldConfidenceMap,
  ImportKnowledge,
  PropertyImportResult,
  StudioDocumentRef,
  StudioImageRef,
} from "./types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function mapSubType(raw: string): AdminPropertyFormState["sub_type"] {
  const v = raw.toLowerCase();
  if (v.includes("plot")) return "plot";
  if (v.includes("sco")) return "sco";
  if (v.includes("house") || v.includes("villa") || v.includes("kothi")) return "house";
  if (v.includes("office")) return "office";
  if (v.includes("warehouse")) return "warehouse";
  if (v.includes("cowork")) return "coworking";
  if (v.includes("builder")) return "builder_floor";
  return "flat";
}

function mapListingType(raw: string): AdminPropertyFormState["type"] {
  const v = raw.toLowerCase();
  if (v.includes("rent")) return "rent";
  if (v.includes("commercial")) return "commercial";
  return "buy";
}

function assignDocs(docs: StudioDocumentRef[]) {
  const brochure = docs.find((d) => d.category === "brochure")?.url || docs[0]?.url || "";
  const masterPlan = docs.find((d) => d.category === "master_plan")?.url || "";
  const floorPlans = docs.filter((d) => d.category === "layout").map((d) => d.url);
  const pdf =
    docs.find((d) => d.category === "price_list" || d.category === "rera" || d.category === "payment_plan")
      ?.url ||
    docs.find((d) => d.url !== brochure)?.url ||
    "";
  return { brochure, masterPlan, floorPlans, pdf };
}

function buildFutureInfrastructure(fields: ExtractedListingFields): string {
  return [
    fields.roadStatus && fields.roadWidth
      ? `${fields.roadStatus} ${fields.roadWidth}${fields.roadName ? ` ${fields.roadName}` : ""}`
      : fields.roadWidth
        ? `${fields.roadWidth}${fields.roadName ? ` ${fields.roadName}` : ""}`
        : "",
    fields.connectivityAdvantage,
    fields.connectivity ? `${fields.connectivity} connectivity` : "",
    fields.areaType,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function mapExtractionToForm(
  fields: ExtractedListingFields,
  confidence: FieldConfidenceMap,
  options: {
    images: StudioImageRef[];
    documents: StudioDocumentRef[];
    knowledge: ImportKnowledge;
    snippets?: Record<string, string>;
  },
): PropertyImportResult {
  const form = createEmptyAdminPropertyForm();
  const photos = options.images.map((i) => i.url);
  const docs = assignDocs(options.documents);

  const title =
    fields.projectName ||
    [fields.segment, fields.propertyType || fields.configuration, fields.locality || fields.city]
      .filter(Boolean)
      .join(" ") ||
    "Untitled Project";

  const bedroomsMatch = fields.configuration.match(/(\d)/);
  // Apartment area only — never strip plot ranges (prevents 100-150 → 100150)
  const apartmentAreaMatch = fields.apartmentSizes.match(/(\d+(?:\.\d+)?)/);
  const area = apartmentAreaMatch?.[1] || "";

  form.title = title;
  form.type = mapListingType(fields.listingType);
  form.sub_type = mapSubType(fields.propertyType || fields.configuration);
  form.price = fields.totalPrice || fields.price;
  form.area_sqft = area;
  form.bedrooms = bedroomsMatch?.[1] || "";
  form.city = fields.city || form.city;
  form.sector = fields.sector;
  form.location =
    fields.location ||
    fields.locality ||
    [fields.nearbyLandmark, fields.sector, fields.city].filter(Boolean).join(", ");
  form.lat = fields.lat;
  form.lng = fields.lng;
  form.contact_name = fields.contactName || fields.seller || fields.builder;
  form.contact_phone = fields.phone;
  form.amenities = fields.amenities;
  form.photos = photos;
  form.featured_image = photos[0] || "";
  form.builder_name = fields.builder || fields.developer;
  form.facing = fields.facing;
  form.rera_number =
    fields.rera ||
    (fields.reraStatus
      ? fields.reraStatus.toLowerCase().startsWith("rera")
        ? fields.reraStatus
        : `RERA ${fields.reraStatus}`
      : "");
  form.possession = fields.possession || fields.launchStatus;
  form.parking = fields.parking === "Yes" ? "Available" : form.parking;

  form.basic = {
    ...form.basic,
    builder: fields.builder || fields.developer,
    seller: fields.seller || fields.contactName,
    project: fields.projectName,
    configuration: fields.configuration || fields.propertyType,
    propertyStatus: /ready/i.test(fields.launchStatus || fields.possession)
      ? "ready"
      : "under-construction",
    purpose: /invest/i.test(fields.suitableFor) ? "investment" : form.basic.purpose,
  };

  const airportDisplay = [
    fields.airportProximity,
    fields.nearbyAirport,
    fields.airportDistance && fields.airportDistance !== fields.airportProximity
      ? fields.airportDistance
      : "",
  ]
    .filter(Boolean)
    .join(" — ");

  form.locationMeta = {
    ...form.locationMeta,
    locality: fields.locality || fields.location,
    landmark: fields.nearbyLandmark || fields.landmark,
    areaCategory: fields.areaType || fields.segment,
    airportDistance: airportDisplay || fields.airportDistance,
    schoolDistance: fields.schoolDistance,
    hospitalDistance: fields.hospitalDistance,
    mallDistance: fields.mallDistance,
    highwayDistance: fields.highwayDistance,
    upcomingMetro: fields.metroDistance,
    futureInfrastructure: buildFutureInfrastructure(fields),
    googleMapsUrl: fields.googleMapsUrl,
  };

  form.pricing = {
    ...form.pricing,
    currentPrice: fields.totalPrice || fields.price,
    basePrice: fields.totalPrice || fields.price,
    totalPrice: fields.totalPrice || fields.price,
    pricePerSqft: fields.pricePerSqFt,
    pricePerSqyd: fields.pricePerYard,
    pricePerAcre: fields.pricePerAcre,
    paymentPlan: fields.paymentPlan,
  };

  const plotLabel =
    fields.plotSizes ||
    (fields.minPlotSize
      ? fields.maxPlotSize
        ? `${fields.minPlotSize}–${fields.maxPlotSize}${fields.plotSizeUnit ? ` ${fields.plotSizeUnit}` : ""}`
        : `${fields.minPlotSize}${fields.plotSizeUnit ? ` ${fields.plotSizeUnit}` : ""}`
      : "");

  form.specs = {
    ...form.specs,
    plotArea: plotLabel,
    minPlotSize: fields.minPlotSize,
    maxPlotSize: fields.maxPlotSize,
    plotSizeUnit: fields.plotSizeUnit || (/plot/i.test(fields.propertyType) ? "Sq Yard" : ""),
    carpetArea: fields.apartmentSizes,
    powerBackup: fields.powerBackup === "Yes" || fields.amenities.includes("Power Backup") ? "yes" : "",
    lift: fields.lift === "Yes" || fields.amenities.includes("Lift") ? "yes" : "",
  };

  form.media = { ...form.media, youtube: fields.youtube };
  form.documents = {
    brochure: docs.brochure,
    masterPlan: docs.masterPlan,
    floorPlans: docs.floorPlans,
    pdf: docs.pdf,
  };
  form.seo = { slug: slugify(title), canonical: "" };
  form.publishing = { ...form.publishing, workflowStatus: "review" };

  const nearby: AdminPropertyFormState["nearbyPlaces"] = [];
  const pushPlace = (name: string, distance: string, type: string) => {
    if (name || distance) nearby.push({ name: name || type, distance: distance || "Nearby", type });
  };
  if (fields.nearbyAirport || fields.airportDistance) {
    pushPlace(fields.nearbyAirport || "Airport", fields.airportProximity || fields.airportDistance || "Nearby", "airport");
  }
  if (fields.nearbyLandmark) pushPlace(fields.nearbyLandmark, "Adjoining", "landmark");
  if (fields.roadName || fields.roadWidth) {
    pushPlace(
      fields.roadName || "Access Road",
      [fields.roadStatus, fields.roadWidth].filter(Boolean).join(" ") || "Nearby",
      "road",
    );
  }
  pushPlace("School", fields.schoolDistance, "school");
  pushPlace("Hospital", fields.hospitalDistance, "hospital");
  pushPlace("Mall", fields.mallDistance, "mall");
  pushPlace("Metro", fields.metroDistance, "metro");
  pushPlace("Highway", fields.highwayDistance, "highway");
  form.nearbyPlaces = nearby.filter(
    (p) =>
      p.type === "airport" ||
      p.type === "landmark" ||
      p.type === "road" ||
      (Boolean(p.distance) && p.distance !== "Nearby"),
  );

  // Brain facts for semantic search
  const brainFacts: BrainFact[] = buildBrainFacts(fields, confidence, options.snippets);
  const structuredFields = structuredFieldsFromExtraction(fields);
  const semanticSearchText = buildSemanticSearchText(brainFacts, fields);

  options.knowledge.brainFacts = brainFacts;
  options.knowledge.structuredFields = structuredFields;
  options.knowledge.semanticSearchText = semanticSearchText;
  options.knowledge.embeddingStatus = brainFacts.length > 0 ? "pending" : "skipped";
  options.knowledge.extractedText = [
    options.knowledge.whatsappText,
    "",
    "=== STRUCTURED BRAIN FACTS ===",
    semanticSearchText,
  ]
    .filter(Boolean)
    .join("\n");

  form.importKnowledge = options.knowledge;
  form.aiIntelligence = runPropertyIntelligencePipeline(form);

  // Enrich AI compiled outputs with semantic investment signals
  if (form.aiIntelligence) {
    const extras = [
      fields.investmentAdvantage && `Investment advantage: ${fields.investmentAdvantage}`,
      fields.connectivityAdvantage && `Connectivity: ${fields.connectivityAdvantage}`,
      fields.suitableFor && `Suitable for: ${fields.suitableFor}`,
      fields.investorScore && `Investor score: ${fields.investorScore}`,
      fields.projectTrustScore && `Trust score: ${fields.projectTrustScore}`,
    ]
      .filter(Boolean)
      .join("\n");
    if (extras) {
      form.aiIntelligence.compiled = {
        ...form.aiIntelligence.compiled,
        investmentSummary:
          [form.aiIntelligence.compiled.investmentSummary, extras].filter(Boolean).join("\n"),
        buyerSummary:
          fields.buyerHighlights || form.aiIntelligence.compiled.buyerSummary,
        propertySummary:
          fields.shortDescription || form.aiIntelligence.compiled.propertySummary,
        keywords: fields.keywords || form.aiIntelligence.compiled.keywords,
      };
    }
  }

  const missingRequired: string[] = [];
  if (!form.title || form.title === "Untitled Project") missingRequired.push("Title");
  if (!form.contact_phone) missingRequired.push("Contact phone");
  if (!form.location) missingRequired.push("Location");
  if (
    !form.price &&
    !form.pricing.currentPrice &&
    !form.pricing.totalPrice &&
    !fields.pricePerYard &&
    !fields.pricePerSqFt &&
    !fields.pricePerAcre
  ) {
    missingRequired.push("Price");
  }

  const warnings: string[] = [];
  if (photos.length === 0) warnings.push("No photos uploaded — add gallery images before publishing.");
  if (options.documents.length === 0) {
    warnings.push("No PDF documents attached — brochure/RERA recommended.");
  }
  if (!fields.rera && !fields.reraStatus) {
    warnings.push("RERA not detected — verify compliance before approval.");
  }
  if (!form.builder_name) warnings.push("Builder name uncertain — confirm developer.");
  if (Object.values(confidence).some((c) => c < 70)) {
    warnings.push("Some fields have low confidence — review highlighted values.");
  }

  const labelMap: Record<string, string> = Object.fromEntries(
    brainFacts.map((f) => [f.key, f.label]),
  );

  const lowConfidenceFields = Object.entries(confidence)
    .filter(([, c]) => c > 0 && c < 70)
    .map(([path, c]) => ({
      path,
      label: labelMap[path] || path,
      confidence: c,
    }))
    .slice(0, 16);

  const summary =
    fields.buyerHighlights ||
    fields.shortDescription ||
    form.aiIntelligence?.compiled.propertySummary ||
    [title, fields.configuration, form.location].filter(Boolean).join(" · ");

  const fieldConfidence: FieldConfidenceMap = {
    ...confidence,
    title: confidence.projectName || confidence.propertyType || 60,
    builder_name: confidence.builder || confidence.developer || 0,
    contact_phone: confidence.phone || 0,
    "basic.project": confidence.projectName || 0,
    "basic.builder": confidence.builder || 0,
    "basic.configuration": confidence.configuration || confidence.propertyType || 0,
    "pricing.currentPrice": confidence.price || confidence.pricePerYard || 0,
    "pricing.pricePerSqft": confidence.pricePerSqFt || confidence.pricePerYard || 0,
    "locationMeta.locality": confidence.locality || confidence.location || 0,
    "locationMeta.airportDistance":
      confidence.nearbyAirport || confidence.airportProximity || confidence.airportDistance || 0,
    "locationMeta.landmark": confidence.nearbyLandmark || confidence.landmark || 0,
    "locationMeta.futureInfrastructure":
      confidence.roadWidth || confidence.connectivityAdvantage || 0,
    "locationMeta.areaCategory": confidence.areaType || confidence.segment || 0,
    rera_number: confidence.rera || confidence.reraStatus || 0,
  };

  form.fieldConfidence = fieldConfidence;
  options.knowledge.fieldConfidence = fieldConfidence;

  return {
    form,
    fieldConfidence,
    warnings,
    missingRequired,
    knowledge: options.knowledge,
    summary,
    lowConfidenceFields,
    brainFacts,
  };
}
