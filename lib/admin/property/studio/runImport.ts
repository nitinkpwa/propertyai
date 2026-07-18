import "server-only";
import { classifyDocuments } from "./semanticExtract";
import { mapExtractionToForm } from "./mapExtractionToForm";
import { extractListingWithAI } from "./openaiExtract";
import type { ImportKnowledge, PropertyImportRequest, PropertyImportResult } from "./types";

export async function runPropertyImport(request: PropertyImportRequest): Promise<PropertyImportResult> {
  const documents = classifyDocuments(request.documents || []);
  const images = request.images || [];
  const whatsappText = request.whatsappText || "";

  const { fields, confidence, snippets } = await extractListingWithAI({
    whatsappText,
    documentNames: documents.map((d) => d.name),
    imageCount: images.length,
    googleMapsUrl: request.googleMapsUrl,
    lat: request.lat,
    lng: request.lng,
  });

  const knowledge: ImportKnowledge = {
    source: request.source || "whatsapp",
    whatsappText,
    extractedText: whatsappText,
    ocrSnippets: documents.map((d) => `[${d.category}] ${d.name}`),
    documentRefs: documents,
    imageRefs: images,
    googleMapsUrl: request.googleMapsUrl || fields.googleMapsUrl || "",
    lat: request.lat || fields.lat || "",
    lng: request.lng || fields.lng || "",
    fieldConfidence: confidence,
    brainFacts: [],
    structuredFields: {},
    semanticSearchText: "",
    embeddingStatus: "pending",
    importedAt: new Date().toISOString(),
  };

  return mapExtractionToForm(fields, confidence, {
    images,
    documents,
    knowledge,
    snippets,
  });
}
