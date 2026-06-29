"use client";

import PropertyCard, { type PropertyCardProps } from "./PropertyCard";
import { useSavedPropertyToggle } from "@/lib/buyer/useSavedProperty";

interface SaveablePropertyCardListProps {
  properties: PropertyCardProps[];
  className?: string;
}

export default function SaveablePropertyCardList({
  properties,
  className,
}: SaveablePropertyCardListProps) {
  const { isSaved, handleFavoriteToggle } = useSavedPropertyToggle();

  return (
    <div className={className}>
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          {...property}
          href={property.href ?? `/property/${property.id}`}
          isFavorite={isSaved(property.id)}
          onFavoriteToggle={handleFavoriteToggle}
        />
      ))}
    </div>
  );
}
