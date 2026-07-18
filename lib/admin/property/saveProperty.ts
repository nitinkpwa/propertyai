import { supabase } from "@/lib/supabase/client";
import { formToDbPayload, formToIntelligencePayload } from "./mappers";
import type { AdminPropertyFormState, AdminPropertySaveResult } from "./types";

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

  const payload = formToDbPayload(form, adminUserId, { existingNearbyPlaces });

  let result = editId
    ? await supabase.from("properties").update(payload).eq("id", editId).select("id").single()
    : await supabase.from("properties").insert(payload).select("id").single();

  if (
    result.error &&
    (result.error.message.includes("site_visit_enabled") || result.error.code === "42703")
  ) {
    const { site_visit_enabled: _sv, ...withoutVisitFlag } = payload;
    result = editId
      ? await supabase.from("properties").update(withoutVisitFlag).eq("id", editId).select("id").single()
      : await supabase.from("properties").insert(withoutVisitFlag).select("id").single();
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

  return { ok: true, propertyId };
}

/** Runs the Property Intelligence pipeline after a property row exists. */
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

export async function uploadAdminPropertyPhoto(file: File, userId: string): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(PROPERTY_PHOTOS_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
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
  const ext = file.name.split(".").pop() || "pdf";
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
