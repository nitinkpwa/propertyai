"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import PropertyCard, { type PropertyCardProps } from "@/app/components/PropertyCard";
import PageHeader from "@/components/ui/PageHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import {
  COLLECTION_PRESETS,
  type CollectionId,
} from "@/lib/buyer/design";
import {
  filterByCollection,
  getPropertyCollection,
  getSavedNote,
  setPropertyCollection,
  setSavedNote,
  sortProperties,
  type SortOption,
} from "@/lib/buyer/collections";
import {
  addComparedProperty,
  fetchSavedPropertyCards,
  removeSavedProperty,
  removeSavedPropertyByPropertyId,
} from "@/lib/buyer/queries";
import EmptyState from "../components/EmptyState";

type SavedCard = PropertyCardProps & { savedRowId: string };

export default function SavedPropertiesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [collection, setCollection] = useState<CollectionId>("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingCompareId, setAddingCompareId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchSavedPropertyCards(user.id).then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, [user]);

  const filteredItems = useMemo(() => {
    const ids = filterByCollection(
      items.map((i) => i.id),
      collection,
    );
    const filtered = items.filter((i) => ids.includes(i.id));
    return sortProperties(filtered, sort);
  }, [items, collection, sort]);

  const handleRemove = async (savedRowId: string) => {
    setRemovingId(savedRowId);
    const ok = await removeSavedProperty(savedRowId);
    if (ok) setItems((prev) => prev.filter((item) => item.savedRowId !== savedRowId));
    setRemovingId(null);
  };

  const handleFavoriteToggle = async (propertyId: string, favorited: boolean) => {
    if (!user || favorited) return;
    const item = items.find((entry) => entry.id === propertyId);
    if (!item) return;
    setRemovingId(item.savedRowId);
    const ok = await removeSavedPropertyByPropertyId(user.id, propertyId);
    if (ok) setItems((prev) => prev.filter((entry) => entry.id !== propertyId));
    setRemovingId(null);
  };

  const handleAddToCompare = async (propertyId: string) => {
    if (!user) return;
    setAddingCompareId(propertyId);
    await addComparedProperty(user.id, propertyId);
    setAddingCompareId(null);
  };

  const handleCollectionChange = (propertyId: string, col: CollectionId) => {
    setPropertyCollection(propertyId, col);
    setItems([...items]);
  };

  const handleSaveNote = (propertyId: string) => {
    setSavedNote(propertyId, noteDraft);
    setEditingNote(null);
    setNoteDraft("");
  };

  if (loading) return <CardGridSkeleton count={3} />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Saved Properties"
        description={`${items.length} ${items.length === 1 ? "property" : "properties"} in your collections`}
        action={
          items.length >= 2 ? (
            <ButtonLink href="/buyer/compare" variant="secondary">
              AI Compare →
            </ButtonLink>
          ) : undefined
        }
      />

      {items.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {COLLECTION_PRESETS.map((col) => (
              <button
                key={col.id}
                type="button"
                onClick={() => setCollection(col.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  collection === col.id
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {col.icon} {col.label}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="ml-auto rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700"
            aria-label="Sort saved properties"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          icon="❤️"
          title="No saved properties yet"
          description="Save properties you like from listings to organize them into collections and compare anytime."
          tips={[
            "Tap the heart icon on any property card to save",
            "Organize saves into Investment, Luxury, or Family collections",
            "Add notes and reminders to track your favorites",
          ]}
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon="📂"
          title="No properties in this collection"
          description="Move saved properties into this collection using the dropdown below each card."
          actionLabel="View All Saved"
          actionHref="/buyer/saved"
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map(({ savedRowId, ...property }) => {
            const note = getSavedNote(property.id);
            const currentCol = getPropertyCollection(property.id);
            return (
              <div key={savedRowId} className="space-y-3">
                <PropertyCard
                  {...property}
                  isFavorite
                  onFavoriteToggle={handleFavoriteToggle}
                />
                <div className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-3">
                  <select
                    value={currentCol === "all" ? "favorites" : currentCol}
                    onChange={(e) => handleCollectionChange(property.id, e.target.value as CollectionId)}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs font-medium text-neutral-700"
                    aria-label="Assign collection"
                  >
                    {COLLECTION_PRESETS.filter((c) => c.id !== "all").map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                  {editingNote === property.id ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="Add a note..."
                        className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-xs"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveNote(property.id)}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingNote(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : note ? (
                    <p className="mt-2 text-xs text-neutral-600">
                      📝 {note}{" "}
                      <button type="button" onClick={() => { setEditingNote(property.id); setNoteDraft(note); }} className="text-emerald-600 hover:underline">
                        Edit
                      </button>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setEditingNote(property.id); setNoteDraft(""); }}
                      className="mt-2 text-xs font-medium text-emerald-600 hover:underline"
                    >
                      + Add note
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleAddToCompare(property.id)}
                    loading={addingCompareId === property.id}
                    loadingText="Adding..."
                  >
                    Compare
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleRemove(savedRowId)}
                    loading={removingId === savedRowId}
                    loadingText="Removing..."
                  >
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
