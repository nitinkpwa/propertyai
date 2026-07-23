"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import PropertyCard, { type PropertyCardProps } from "@/app/components/PropertyCard";
import CompareTable from "@/components/buyer/CompareTable";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Button";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import {
  fetchComparedPropertyCards,
  removeComparedProperty,
  removeComparedPropertyByPropertyId,
  syncComparedProperties,
} from "@/lib/buyer/queries";
import {
  MAX_COMPARE_PROPERTIES,
  getCompareIds,
  mergeCompareIds,
  removeCompareId,
  setCompareIds,
  subscribeCompare,
} from "@/lib/buyer/compareStore";
import EmptyState from "../components/EmptyState";

type ComparedCard = PropertyCardProps & { compareRowId: string };

export default function ComparePage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ComparedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const remote = await fetchComparedPropertyCards(user.id);
    const remoteIds = remote.map((r) => r.id);
    const mergedIds = mergeCompareIds(remoteIds);
    await syncComparedProperties(user.id, mergedIds);

    // Re-fetch after sync so cards match merged set
    const data =
      mergedIds.length === remoteIds.length &&
      mergedIds.every((id) => remoteIds.includes(id))
        ? remote
        : await fetchComparedPropertyCards(user.id);

    // Keep only cards still in the local compare set (stale cleanup)
    const active = new Set(getCompareIds());
    const filtered = data.filter((d) => active.has(d.id));
    setCompareIds(filtered.map((d) => d.id));
    setItems(filtered.slice(0, MAX_COMPARE_PROPERTIES));
    setLoading(false);

    if (filtered.length >= 2) {
      void fetch("/api/crm/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityType: "property_compared",
          title: `Comparing ${filtered.length} properties`,
          description: filtered.map((d) => d.name).join(" vs "),
          propertyId: filtered[0]?.id,
        }),
      });
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return subscribeCompare((ids) => {
      setItems((prev) => prev.filter((item) => ids.includes(item.id)));
    });
  }, []);

  const handleRemove = async (compareRowId: string, propertyId: string) => {
    setRemovingId(compareRowId);
    removeCompareId(propertyId);
    const ok = await removeComparedProperty(compareRowId);
    if (!ok) {
      // Fallback by property id
      if (user) await removeComparedPropertyByPropertyId(user.id, propertyId);
    }
    setItems((prev) => prev.filter((item) => item.compareRowId !== compareRowId));
    setRemovingId(null);
  };

  if (loading) return <CardGridSkeleton count={2} />;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <PageHeader
        title="Compare Properties"
        description={
          items.length >= 2
            ? `Comparing ${items.length} properties side by side`
            : items.length === 1
              ? "Add one more property to unlock comparison"
              : "Select properties from listings to compare side by side"
        }
        action={
          <ButtonLink href="/buyer/saved" variant="secondary">
            From Saved →
          </ButtonLink>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon="⚖️"
          title="Nothing to compare yet"
          description="Add properties to compare from saved listings or property cards to see a professional side-by-side analysis."
          tips={[
            "Tap Compare on any property card (up to 4)",
            "Compare price, ROI, rental yield, and amenities",
            "AI highlights the best value in each category",
          ]}
          actionLabel="Browse Properties"
          actionHref="/properties"
        />
      ) : (
        <>
          <div className="-mx-4 flex gap-5 overflow-x-auto px-4 pb-2 snap-x snap-mandatory lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map(({ compareRowId, ...property }) => (
              <div
                key={compareRowId}
                className="w-[min(100%,320px)] shrink-0 snap-start lg:w-auto lg:shrink"
              >
                <PropertyCard {...property} isCompared />
                <Button
                  variant="secondary"
                  className="mt-3 w-full"
                  onClick={() => handleRemove(compareRowId, property.id)}
                  loading={removingId === compareRowId}
                  loadingText="Removing..."
                >
                  Remove from Compare
                </Button>
              </div>
            ))}
          </div>

          {items.length === 1 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-6 py-8 text-center">
              <p className="text-sm font-medium text-label">Add one more property to compare</p>
              <p className="mt-1 text-xs text-muted">
                You can compare up to {MAX_COMPARE_PROPERTIES} properties
              </p>
              <ButtonLink href="/properties" className="mt-3" variant="secondary">
                Browse Properties
              </ButtonLink>
            </div>
          ) : (
            <CompareTable items={items} />
          )}
        </>
      )}
    </div>
  );
}
