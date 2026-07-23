"use client";

import PropertyCard, { type PropertyCardProps } from "@/app/components/PropertyCard";
import { useSavedPropertyToggle } from "@/lib/buyer/useSavedProperty";
import { useComparedPropertyToggle } from "@/lib/buyer/useComparedProperty";

interface PropertyCardsGridProps {
  properties: PropertyCardProps[];
  columns?: "1" | "2" | "3" | "4";
}

const COLUMN_CLASS = {
  "1": "grid-cols-1",
  "2": "grid-cols-1 md:grid-cols-2",
  "3": "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
  "4": "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
};

export default function PropertyCardsGrid({
  properties,
  columns = "3",
}: PropertyCardsGridProps) {
  const { isSaved, handleFavoriteToggle } = useSavedPropertyToggle();
  const { isCompared, handleCompareToggle } = useComparedPropertyToggle();

  return (
    <div className={`grid gap-5 md:gap-6 ${COLUMN_CLASS[columns]}`}>
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          {...property}
          isFavorite={isSaved(property.id)}
          isCompared={isCompared(property.id)}
          onFavoriteToggle={handleFavoriteToggle}
          onCompareToggle={(id, compared) => {
            void handleCompareToggle(id, compared);
          }}
        />
      ))}
    </div>
  );
}
