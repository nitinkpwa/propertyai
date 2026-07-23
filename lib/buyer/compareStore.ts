/**
 * Compare selection store — localStorage for guests + logged-in cache,
 * Supabase for authenticated persistence. Single source of truth for IDs.
 */

import { readVersionedStorage, writeVersionedStorage } from "@/lib/stability/persistSchema";

export const MAX_COMPARE_PROPERTIES = 4;
export const COMPARE_CHANGED_EVENT = "areaiq:compare-changed";

const STORAGE_KEY = "areaiq_compare_ids";
const SCHEMA_VERSION = 1;

export type CompareToggleResult =
  | { ok: true; compared: boolean; ids: string[] }
  | { ok: false; reason: "max"; ids: string[] };

function isIdList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((id) => typeof id === "string" && id.length > 0)
  );
}

function dedupe(ids: string[]): string[] {
  return Array.from(new Set(ids.filter(Boolean)));
}

function emit(ids: string[]) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(COMPARE_CHANGED_EVENT, { detail: { ids } }),
  );
}

export function getCompareIds(): string[] {
  if (typeof window === "undefined") return [];
  const raw = readVersionedStorage(
    localStorage,
    STORAGE_KEY,
    SCHEMA_VERSION,
    [] as string[],
    isIdList,
  );
  return dedupe(raw).slice(0, MAX_COMPARE_PROPERTIES);
}

export function setCompareIds(ids: string[]): string[] {
  const next = dedupe(ids).slice(0, MAX_COMPARE_PROPERTIES);
  if (typeof window !== "undefined") {
    writeVersionedStorage(localStorage, STORAGE_KEY, SCHEMA_VERSION, next);
  }
  emit(next);
  return next;
}

export function isPropertyCompared(propertyId: string): boolean {
  return getCompareIds().includes(propertyId);
}

export function addCompareId(propertyId: string): CompareToggleResult {
  const current = getCompareIds();
  if (current.includes(propertyId)) {
    return { ok: true, compared: true, ids: current };
  }
  if (current.length >= MAX_COMPARE_PROPERTIES) {
    return { ok: false, reason: "max", ids: current };
  }
  const ids = setCompareIds([...current, propertyId]);
  return { ok: true, compared: true, ids };
}

export function removeCompareId(propertyId: string): CompareToggleResult {
  const ids = setCompareIds(getCompareIds().filter((id) => id !== propertyId));
  return { ok: true, compared: false, ids };
}

export function toggleCompareId(propertyId: string): CompareToggleResult {
  if (isPropertyCompared(propertyId)) {
    return removeCompareId(propertyId);
  }
  return addCompareId(propertyId);
}

export function clearCompareIds(): void {
  setCompareIds([]);
}

export function mergeCompareIds(remoteIds: string[]): string[] {
  const merged = dedupe([...getCompareIds(), ...remoteIds]).slice(
    0,
    MAX_COMPARE_PROPERTIES,
  );
  return setCompareIds(merged);
}

export function subscribeCompare(
  listener: (ids: string[]) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;

  const onChange = (e: Event) => {
    const detail = (e as CustomEvent<{ ids: string[] }>).detail;
    listener(detail?.ids ?? getCompareIds());
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      listener(getCompareIds());
    }
  };

  window.addEventListener(COMPARE_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(COMPARE_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
