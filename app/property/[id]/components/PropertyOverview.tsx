import type { PropertyDetail } from "../data";
import { formatPrice } from "../data";
import { MapPinIcon, SectionCard, SectionTitle } from "./shared";

interface PropertyOverviewProps {
  property: PropertyDetail;
}

export default function PropertyOverview({ property }: PropertyOverviewProps) {
  const specs = [
    { label: "Builder", value: property.builder.name },
    { label: "Project", value: property.project },
    { label: "Location", value: `${property.location}, ${property.city}` },
    { label: "Price", value: formatPrice(property.price) },
    { label: "Price / Sq Ft", value: `₹${property.pricePerSqFt.toLocaleString("en-IN")}` },
    { label: "Possession", value: property.possession },
    { label: "Configuration", value: property.configuration },
    { label: "Total Floors", value: String(property.totalFloors) },
    { label: "Parking", value: property.parking },
    { label: "Facing", value: property.facing },
    { label: "Furnishing", value: property.furnishing },
  ];

  return (
    <SectionCard>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl lg:text-4xl">
          {property.name}
        </h1>
        <p className="mt-2 flex items-center gap-1.5 text-base text-neutral-500">
          <MapPinIcon className="text-neutral-400" />
          {property.location}, {property.city}
        </p>
      </div>

      <SectionTitle title="Property Information" />

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {specs.map((spec) => (
          <div
            key={spec.label}
            className="rounded-xl border border-neutral-100 bg-neutral-50/80 px-4 py-3.5 transition-colors hover:bg-neutral-50"
          >
            <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              {spec.label}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-neutral-900 sm:text-base">{spec.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 border-t border-neutral-100 pt-8">
        <h3 className="mb-3 text-lg font-semibold text-neutral-900">Property Description</h3>
        <p className="text-sm leading-relaxed text-neutral-600 sm:text-base sm:leading-7">
          {property.description}
        </p>
      </div>
    </SectionCard>
  );
}
