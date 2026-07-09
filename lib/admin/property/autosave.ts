import type { AdminPropertyFormState } from "./types";

const DRAFT_PREFIX = "areaiq-admin-property-draft";

export function draftKey(propertyId: string | null): string {
  return propertyId ? `${DRAFT_PREFIX}:${propertyId}` : `${DRAFT_PREFIX}:new`;
}

export function saveDraftToLocal(form: AdminPropertyFormState, propertyId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      draftKey(propertyId),
      JSON.stringify({ savedAt: new Date().toISOString(), form }),
    );
  } catch {
    // ignore quota errors
  }
}

export function loadDraftFromLocal(propertyId: string | null): AdminPropertyFormState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey(propertyId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { form?: AdminPropertyFormState };
    return parsed.form ?? null;
  } catch {
    return null;
  }
}

export function clearDraftFromLocal(propertyId: string | null): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(draftKey(propertyId));
}
