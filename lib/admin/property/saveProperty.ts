import { supabase } from "@/lib/supabase/client";
import {
  buildNearbyPlacesPayload,
  emptyPropertyStructuredMeta,
  extractNearbyPlacesList,
  extractPropertyMeta,
} from "@/lib/properties/nearbyPlacesMeta";
import { formToDbPayload, formToIntelligencePayload } from "./mappers";
import type { AdminPropertyFormState, AdminPropertySaveResult } from "./types";
import {
  LEGAL_VERIFICATION_FIELDS,
  emptyLegalVerification,
  legalFlagsPayload,
  legalFlagsToMetaBlob,
  type LegalVerificationFlags,
  type LegalVerificationState,
} from "./legalVerification";

const LEGAL_COLUMN_KEYS = [
  ...LEGAL_VERIFICATION_FIELDS.map((f) => f.key),
  "legal_verification_updated_at",
  "legal_verification_updated_by",
] as const;

function stripLegalColumns(payload: Record<string, unknown>): Record<string, unknown> {
  const next = { ...payload };
  for (const key of LEGAL_COLUMN_KEYS) {
    delete next[key];
  }
  delete next.site_visit_enabled;
  return next;
}

export async function saveAdminProperty(
  form: AdminPropertyFormState,
  adminUserId: string,
  editId: string | null,
): Promise<AdminPropertySaveResult> {
  let existingNearbyPlaces: unknown;
  if (editId) {
    const existing = await fetchAdminPropertyById(editId);
    existingNearbyPlaces = existing?.nearby_places;
  }

  // Ensure legal timestamps are stamped on full save
  const stampedForm: AdminPropertyFormState = {
    ...form,
    legal: {
      ...form.legal,
      legal_verification_updated_at:
        form.legal.legal_verification_updated_at || new Date().toISOString(),
      legal_verification_updated_by:
        form.legal.legal_verification_updated_by || adminUserId,
    },
  };

  const payload = formToDbPayload(stampedForm, adminUserId, {
    existingNearbyPlaces,
    // Edits must never steal ownership or unpublish via workflow meta drift.
    preserveSellerId: Boolean(editId),
    preserveStatus: Boolean(editId),
  });

  // Also stamp column-level updated_by on full save when any flag is set
  if (countEnabled(stampedForm.legal) > 0 || stampedForm.legal.legal_verification_updated_at) {
    payload.legal_verification_updated_at = stampedForm.legal.legal_verification_updated_at;
    payload.legal_verification_updated_by = stampedForm.legal.legal_verification_updated_by;
  }

  let result = editId
    ? await supabase.from("properties").update(payload).eq("id", editId).select("id").single()
    : await supabase.from("properties").insert(payload).select("id").single();

  // Graceful fallback: if dedicated columns aren't migrated yet, persist via nearby_places.meta
  if (
    result.error &&
    (result.error.message.includes("site_visit_enabled") ||
      result.error.message.includes("approved_building_plan") ||
      result.error.message.includes("rera_certificate") ||
      result.error.message.includes("legal_verification") ||
      result.error.code === "42703")
  ) {
    const withoutCols = stripLegalColumns(payload);
    result = editId
      ? await supabase.from("properties").update(withoutCols).eq("id", editId).select("id").single()
      : await supabase.from("properties").insert(withoutCols).select("id").single();
  }

  const { data: inserted, error } = result;

  if (error) {
    return { ok: false, error: error.message };
  }

  const propertyId = editId ?? (inserted?.id as string);

  // Connect Partner is optional — sync assignment (or clear) after the row exists.
  if (propertyId) {
    const assignRes = await fetch(`/api/admin/properties/${propertyId}/partner`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectPartnerId: form.connect_partner_id || null }),
    });
    if (!assignRes.ok) {
      return {
        ok: false,
        error: "Property saved, but Connect Partner assignment failed.",
        propertyId,
      };
    }
  }

  await bumpPublicPropertyCache(propertyId);
  return { ok: true, propertyId };
}

function countEnabled(flags: LegalVerificationFlags): number {
  return LEGAL_VERIFICATION_FIELDS.reduce((n, f) => n + (flags[f.key] ? 1 : 0), 0);
}

async function bumpPublicPropertyCache(propertyId: string | undefined) {
  if (!propertyId || typeof window === "undefined") return;
  try {
    await fetch("/api/admin/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId }),
    });
  } catch {
    /* non-blocking */
  }
}

/**
 * Auto-save legal verification toggles.
 * Single update writes columns (when present) + nearby_places.meta together
 * so OFF toggles cannot resurrect via OR-merge of stale stores.
 */
export async function saveLegalVerificationFlags(
  propertyId: string,
  flags: LegalVerificationState | LegalVerificationFlags,
  adminUserId: string,
): Promise<AdminPropertySaveResult> {
  const existing = await fetchAdminPropertyById(propertyId);
  if (!existing) {
    return { ok: false, error: "Property not found" };
  }

  const stamped: LegalVerificationState = {
    ...emptyLegalVerification(),
    ...flags,
    legal_verification_updated_at: new Date().toISOString(),
    legal_verification_updated_by: adminUserId,
    legal_verification_updated_by_name:
      "legal_verification_updated_by_name" in flags &&
      typeof (flags as LegalVerificationState).legal_verification_updated_by_name === "string"
        ? (flags as LegalVerificationState).legal_verification_updated_by_name
        : null,
  };

  const places = extractNearbyPlacesList(existing.nearby_places);
  const existingMeta = extractPropertyMeta(existing.nearby_places);
  const nextMeta = {
    ...(existingMeta ?? emptyPropertyStructuredMeta()),
    legalVerification: legalFlagsToMetaBlob(stamped),
  };

  const columnPayload = legalFlagsPayload(stamped, adminUserId);
  const fullPayload = {
    ...columnPayload,
    nearby_places: buildNearbyPlacesPayload(places, nextMeta),
    updated_at: new Date().toISOString(),
  };

  let { error } = await supabase
    .from("properties")
    .update(fullPayload)
    .eq("id", propertyId);

  // Graceful fallback when dedicated columns aren't migrated yet
  if (
    error &&
    (error.code === "42703" ||
      /approved_building_plan|rera_certificate|legal_verification|column/i.test(error.message))
  ) {
    const metaOnly = {
      nearby_places: fullPayload.nearby_places,
      updated_at: fullPayload.updated_at,
    };
    const retry = await supabase.from("properties").update(metaOnly).eq("id", propertyId);
    error = retry.error;
  }

  if (error) {
    return { ok: false, error: error.message };
  }

  await bumpPublicPropertyCache(propertyId);
  return { ok: true, propertyId };
}

export async function savePropertyIntelligence(
  form: AdminPropertyFormState,
  propertyId: string,
): Promise<AdminPropertySaveResult> {
  const existing = await fetchAdminPropertyById(propertyId);
  if (!existing) {
    return { ok: false, error: "Property not found" };
  }

  const payload = formToIntelligencePayload(form, existing.nearby_places);
  const { error } = await supabase.from("properties").update(payload).eq("id", propertyId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await bumpPublicPropertyCache(propertyId);
  return { ok: true, propertyId };
}

export async function fetchAdminPropertyById(propertyId: string) {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

const PROPERTY_PHOTOS_BUCKET = "property-photos";
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_DOC_BYTES = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
]);
const ALLOWED_DOC_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function safeExt(file: File, fallback: string): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,8}$/.test(fromName)) return fromName;
  return fallback;
}

export async function uploadAdminPropertyPhoto(file: File, userId: string): Promise<string | null> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_PHOTO_BYTES) {
    console.error("uploadAdminPropertyPhoto: invalid type or size", file.type, file.size);
    return null;
  }
  const ext = safeExt(file, "jpg");
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(PROPERTY_PHOTOS_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) {
    console.error("uploadAdminPropertyPhoto:", error.message);
    return null;
  }
  const { data } = supabase.storage.from(PROPERTY_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Upload brochure / price list / layout PDFs (and other docs) into property storage. */
export async function uploadAdminPropertyDocument(
  file: File,
  userId: string,
): Promise<string | null> {
  if (!ALLOWED_DOC_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_DOC_BYTES) {
    console.error("uploadAdminPropertyDocument: invalid type or size", file.type, file.size);
    return null;
  }
  const ext = safeExt(file, "pdf");
  const path = `${userId}/docs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(PROPERTY_PHOTOS_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "application/pdf",
  });
  if (error) {
    console.error("uploadAdminPropertyDocument:", error.message);
    return null;
  }
  const { data } = supabase.storage.from(PROPERTY_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
