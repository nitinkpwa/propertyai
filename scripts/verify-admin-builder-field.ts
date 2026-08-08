import {
  adminRowToForm,
  formToDbPayload,
  syncLegacyFormFields,
  withSyncedBuilderName,
} from "../lib/admin/property/mappers";
import { extractPropertyMeta } from "../lib/properties/nearbyPlacesMeta";
import type { AdminPropertyFormSource } from "../lib/admin/property/types";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const tagline = "greenery that rejuvenates body and soul";

const baseRow = {
  id: "p1",
  seller_id: "s1",
  title: "Prisma Magnus",
  description: "",
  type: "buy",
  sub_type: "flat",
  price: 10000000,
  area_sqft: 1800,
  bedrooms: 3,
  bathrooms: 3,
  location: "Mohali",
  city: "Mohali",
  photos: [],
  amenities: [],
  status: "active",
  is_featured: false,
  contact_name: "Seller",
  contact_phone: "9999999999",
  created_at: new Date().toISOString(),
} as AdminPropertyFormSource;

const metaTagline = {
  places: [],
  meta: {
    v: 2 as const,
    basic: {
      builder: tagline,
      seller: "Seller",
      project: "Prisma Magnus -1",
      configuration: "3 BHK",
      propertyStatus: "ready",
      purpose: "end-use",
      ownership: "freehold",
    },
  },
};

// Column wins over import-meta tagline
const hydratedColumn = adminRowToForm({
  ...baseRow,
  builder_name: "Stellar Group",
  nearby_places: metaTagline,
});
assert(hydratedColumn.builder_name === "Stellar Group", "column builder must win");
assert(hydratedColumn.basic.builder === "Stellar Group", "nested builder must match column");
assert(hydratedColumn.basic.project === "Prisma Magnus -1", "project must stay from meta");
assert(hydratedColumn.title === "Prisma Magnus", "title must stay");

// Meta fills only when column empty
const hydratedMeta = adminRowToForm({
  ...baseRow,
  builder_name: "",
  nearby_places: metaTagline,
});
assert(hydratedMeta.builder_name === tagline, "empty column falls back to meta builder");
assert(hydratedMeta.basic.builder === tagline, "meta fallback mirrors nested");

// Typing + clear must persist through syncLegacyFormFields
const typed = syncLegacyFormFields(
  withSyncedBuilderName(hydratedMeta, "Stellar Group"),
);
assert(typed.builder_name === "Stellar Group", "typed builder_name");
assert(typed.basic.builder === "Stellar Group", "typed nested builder");

const cleared = syncLegacyFormFields(withSyncedBuilderName(typed, ""));
assert(cleared.builder_name === "", "clear builder_name");
assert(cleared.basic.builder === "", "clear nested builder");

// Save payload writes column + meta together
const payload = formToDbPayload(typed, "admin-1", { preserveSellerId: true, preserveStatus: true });
assert(payload.builder_name === "Stellar Group", "save column");
assert(payload.title === "Prisma Magnus", "save must not change title");
assert(payload.contact_name === "Seller", "save must not change seller");
const savedMeta = extractPropertyMeta(payload.nearby_places);
assert(savedMeta?.basic.builder === "Stellar Group", "save meta.basic.builder");
assert(savedMeta?.basic.project === "Prisma Magnus -1", "save must not change project");

console.log("verify-admin-builder-field: ok");
