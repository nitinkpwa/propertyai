"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import PropertyCard, { type PropertyCardProps } from "@/app/components/PropertyCard";
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
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingCompareId, setAddingCompareId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchSavedPropertyCards(user.id).then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, [user]);

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

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
          Saved Properties
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          {items.length} {items.length === 1 ? "property" : "properties"} saved for later
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="❤️"
          title="No saved properties yet"
          description="Save properties you like from listings to compare and revisit them anytime."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map(({ savedRowId, ...property }) => (
            <div key={savedRowId} className="space-y-3">
              <PropertyCard
                {...property}
                isFavorite
                onFavoriteToggle={handleFavoriteToggle}
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleAddToCompare(property.id)}
                  disabled={addingCompareId === property.id}
                  className="rounded-xl border border-neutral-200 bg-white py-2.5 text-sm font-semibold text-neutral-700 transition-all hover:bg-neutral-50 disabled:opacity-60"
                >
                  {addingCompareId === property.id ? "Adding..." : "Add to Compare"}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(savedRowId)}
                  disabled={removingId === savedRowId}
                  className="rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-sm font-semibold text-rose-600 transition-all hover:bg-rose-100 disabled:opacity-60"
                >
                  {removingId === savedRowId ? "Removing..." : "Remove"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
