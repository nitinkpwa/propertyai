"use client";

import PropertyCard, { type PropertyCardProps } from "@/app/components/PropertyCard";
import { useSavedPropertyToggle } from "@/lib/buyer/useSavedProperty";

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

  return (
    <div className={`grid gap-5 md:gap-6 ${COLUMN_CLASS[columns]}`}>
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          {...property}
          isFavorite={isSaved(property.id)}
          onFavoriteToggle={handleFavoriteToggle}
        />
      ))}
    </div>
  );
}
