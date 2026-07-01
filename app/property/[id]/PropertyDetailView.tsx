import type { PropertyDetail } from "./data";
import AISummary from "./components/AISummary";
import AmenitiesSection from "./components/AmenitiesSection";
import AreaIntelligence from "./components/AreaIntelligence";
import BookingCard from "./components/BookingCard";
import BottomCTA from "./components/BottomCTA";
import BuilderSection from "./components/BuilderSection";
import FloorPlans from "./components/FloorPlans";
import LocationSection from "./components/LocationSection";
import PropertyGallery from "./components/PropertyGallery";
import PropertyOverview from "./components/PropertyOverview";
import SimilarProperties from "./components/SimilarProperties";
import Logo from "@/components/common/Logo";

interface PropertyDetailViewProps {
  property: PropertyDetail;
}

export default function PropertyDetailView({ property }: PropertyDetailViewProps) {
  return (
    <div className="min-h-screen bg-neutral-50 pt-16">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px] lg:gap-10 xl:grid-cols-[1fr_400px]">
          <div className="min-w-0 space-y-6 sm:space-y-8">
            <PropertyGallery images={property.images} propertyName={property.name} />

            <div className="space-y-6 sm:space-y-8 lg:hidden">
              <BookingCard property={property} />
            </div>

            <PropertyOverview property={property} />
            <AmenitiesSection amenities={property.amenities} />
            <AreaIntelligence propertyId={property.id} />
            <AISummary summary={property.aiSummary} />
            <FloorPlans floorPlans={property.floorPlans} />
            <LocationSection property={property} />
            <BuilderSection builder={property.builder} />
            <SimilarProperties properties={property.similarProperties} />
            <BottomCTA property={property} />
          </div>

          <div className="hidden lg:block">
            <BookingCard property={property} />
          </div>
        </div>
      </div>

      <footer className="mt-12 border-t border-neutral-200 bg-neutral-900 text-neutral-400">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
          <Logo size="footer" variant="dark" href="/" />
          <p className="text-center text-xs sm:text-sm">
            AI-Powered Property Intelligence · Chandigarh · Mohali · Panchkula
          </p>
          <p className="text-xs sm:text-sm">© {new Date().getFullYear()} AreaIQ</p>
        </div>
      </footer>
    </div>
  );
}
