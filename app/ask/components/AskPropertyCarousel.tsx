"use client";

import PropertyCard, { type PropertyCardProps } from "@/app/components/PropertyCard";
import { useSavedPropertyToggle } from "@/lib/buyer/useSavedProperty";

interface AskPropertyCarouselProps {
  properties: PropertyCardProps[];
  label: string;
}

export default function AskPropertyCarousel({ properties, label }: AskPropertyCarouselProps) {
  const { isSaved, handleFavoriteToggle } = useSavedPropertyToggle();

  if (properties.length === 0) return null;

  return (
    <div style={{ marginTop: "12px", marginLeft: "44px" }}>
      <div
        style={{
          fontSize: "12px",
          color: "#A67C5B",
          marginBottom: "8px",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        🏠 {label}
      </div>
      <div
        style={{
          display: "flex",
          gap: "12px",
          overflowX: "auto",
          paddingBottom: "8px",
          scrollSnapType: "x mandatory",
        }}
      >
        {properties.map((property) => (
          <div
            key={property.id}
            style={{
              minWidth: "280px",
              maxWidth: "280px",
              flexShrink: 0,
              scrollSnapAlign: "start",
            }}
          >
            <PropertyCard
              {...property}
              href={property.href ?? `/property/${property.id}`}
              isFavorite={isSaved(property.id)}
              onFavoriteToggle={handleFavoriteToggle}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
