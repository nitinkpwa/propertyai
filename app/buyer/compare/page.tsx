"use client";

import { useEffect, useState } from "react";
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
} from "@/lib/buyer/queries";
import EmptyState from "../components/EmptyState";

type ComparedCard = PropertyCardProps & { compareRowId: string };

export default function ComparePage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ComparedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchComparedPropertyCards(user.id).then((data) => {
      setItems(data);
      setLoading(false);
      if (data.length >= 2) {
        void fetch("/api/crm/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activityType: "property_compared",
            title: `Comparing ${data.length} properties`,
            description: data.map((d) => d.name).join(" vs "),
            propertyId: data[0]?.id,
          }),
        });
      }
    });
  }, [user]);

  const handleRemove = async (compareRowId: string) => {
    setRemovingId(compareRowId);
    const ok = await removeComparedProperty(compareRowId);
    if (ok) setItems((prev) => prev.filter((item) => item.compareRowId !== compareRowId));
    setRemovingId(null);
  };

  if (loading) return <CardGridSkeleton count={2} />;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Compare Properties"
        description={
          items.length >= 2
            ? `Comparing ${items.length} properties side by side`
            : "Add at least 2 properties to unlock comparison"
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
            "Save properties first, then add them to compare",
            "Compare price, ROI, rental yield, and amenities",
            "AI highlights the best value in each category",
          ]}
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
                  onClick={() => handleRemove(compareRowId)}
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
              <p className="text-sm font-medium text-neutral-700">Add one more property to compare</p>
              <ButtonLink href="/buyer/saved" className="mt-3" variant="secondary">
                Go to Saved Properties
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
