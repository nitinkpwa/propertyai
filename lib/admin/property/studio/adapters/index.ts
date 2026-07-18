import type { ImportAdapter, ImportSource, PropertyImportRequest } from "../types";

function stubNormalize(_input: unknown): Partial<PropertyImportRequest> {
  return {};
}

export const whatsappPasteAdapter: ImportAdapter = {
  source: "whatsapp",
  label: "WhatsApp Paste",
  implemented: true,
  normalize(input: unknown): Partial<PropertyImportRequest> {
    if (typeof input === "string") {
      return { whatsappText: input, source: "whatsapp" };
    }
    if (input && typeof input === "object" && "whatsappText" in input) {
      return {
        ...(input as PropertyImportRequest),
        source: "whatsapp",
      };
    }
    return { source: "whatsapp" };
  },
};

function makeStub(source: ImportSource, label: string): ImportAdapter {
  return {
    source,
    label,
    implemented: false,
    normalize: stubNormalize,
  };
}

export const IMPORT_ADAPTERS: ImportAdapter[] = [
  whatsappPasteAdapter,
  makeStub("email", "Email"),
  makeStub("telegram", "Telegram"),
  makeStub("excel", "Excel"),
  makeStub("csv", "CSV"),
  makeStub("erp", "Builder ERP"),
  makeStub("url", "Website URL"),
  makeStub("folder", "Folder Upload"),
  makeStub("gdrive", "Google Drive"),
];

export function getImportAdapter(source: ImportSource): ImportAdapter | undefined {
  return IMPORT_ADAPTERS.find((a) => a.source === source);
}
