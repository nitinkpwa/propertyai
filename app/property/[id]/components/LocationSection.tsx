import type { PropertyDetail } from "../data";
import { getPlaceIcon, SectionCard, SectionTitle } from "./shared";

interface LocationSectionProps {
  property: PropertyDetail;
}

export default function LocationSection({ property }: LocationSectionProps) {
  return (
    <SectionCard>
      <SectionTitle
        title="Location"
        subtitle={`${property.location}, ${property.city}`}
      />

      <div className="relative mb-6 aspect-[16/9] overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-br from-emerald-100/50 via-neutral-100 to-neutral-200 sm:rounded-3xl">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <span className="text-4xl">🗺️</span>
          <p className="text-sm font-medium text-muted">Google Map</p>
          <p className="text-xs text-muted">Interactive map placeholder</p>
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
          <div className="flex flex-col items-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
              📍
            </span>
            <span className="mt-1 rounded-md bg-white px-2 py-0.5 text-xs font-semibold shadow-md">
              {property.name}
            </span>
          </div>
        </div>
      </div>

      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Nearby Places</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {property.nearbyPlaces.map((place) => (
          <div
            key={place.name}
            className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50/80 px-4 py-3.5 transition-all hover:border-emerald-200/60 hover:bg-emerald-50/30"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
              {getPlaceIcon(place.type)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-heading-primary">{place.name}</p>
              <p className="text-xs text-muted">{place.distance}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
