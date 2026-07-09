/** Client-side saved property collections (no DB schema change) */
import type { CollectionId } from "./design";

const STORAGE_KEY = "areaiq_buyer_collections";
const NOTES_KEY = "areaiq_buyer_saved_notes";

type CollectionMap = Record<string, CollectionId>;

function readCollections(): CollectionMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as CollectionMap;
  } catch {
    return {};
  }
}

function writeCollections(map: CollectionMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getPropertyCollection(propertyId: string): CollectionId {
  return readCollections()[propertyId] ?? "all";
}

export function setPropertyCollection(propertyId: string, collection: CollectionId) {
  const map = readCollections();
  if (collection === "all") {
    delete map[propertyId];
  } else {
    map[propertyId] = collection;
  }
  writeCollections(map);
}

export function filterByCollection(
  propertyIds: string[],
  collection: CollectionId,
): string[] {
  if (collection === "all") return propertyIds;
  const map = readCollections();
  return propertyIds.filter((id) => map[id] === collection);
}

type NotesMap = Record<string, string>;

function readNotes(): NotesMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY) ?? "{}") as NotesMap;
  } catch {
    return {};
  }
}

function writeNotes(map: NotesMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTES_KEY, JSON.stringify(map));
}

export function getSavedNote(propertyId: string): string {
  return readNotes()[propertyId] ?? "";
}

export function setSavedNote(propertyId: string, note: string) {
  const map = readNotes();
  if (!note.trim()) {
    delete map[propertyId];
  } else {
    map[propertyId] = note.trim();
  }
  writeNotes(map);
}

export type SortOption = "newest" | "oldest" | "price-asc" | "price-desc";

export function sortProperties<T extends { price: number; savedRowId?: string }>(
  items: T[],
  sort: SortOption,
): T[] {
  const copy = [...items];
  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => a.price - b.price);
    case "price-desc":
      return copy.sort((a, b) => b.price - a.price);
    case "oldest":
      return copy.reverse();
    default:
      return copy;
  }
}
