import type { ListingProperty } from "@/lib/properties/types";
import SaveablePropertyCardList from "./SaveablePropertyCardList";

interface PropertyGridProps {
  properties: ListingProperty[];
}

export default function PropertyGrid({ properties }: PropertyGridProps) {
  return (
    <SaveablePropertyCardList
      properties={properties}
      className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-7"
    />
  );
}
