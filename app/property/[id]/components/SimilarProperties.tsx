import type { PropertyCardProps } from "../../../components/PropertyCard";
import SaveablePropertyCardList from "../../../components/SaveablePropertyCardList";
import { SectionTitle } from "./shared";

interface SimilarPropertiesProps {
  properties: PropertyCardProps[];
}

export default function SimilarProperties({ properties }: SimilarPropertiesProps) {
  const propertiesWithHref = properties.map((property) => ({
    ...property,
    href: property.href ?? `/property/${property.id}`,
  }));

  return (
    <section>
      <SectionTitle title="Similar Properties" subtitle="You might also be interested in" />
      <SaveablePropertyCardList
        properties={propertiesWithHref}
        className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-4"
      />
    </section>
  );
}
