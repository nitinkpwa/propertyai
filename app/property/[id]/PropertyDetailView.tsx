"use client";

import { useCallback, useRef } from "react";
import type { PropertyDetail } from "./data";
import AISummary from "./components/AISummary";
import AmenitiesSection from "./components/AmenitiesSection";
import AppreciationPrediction from "./components/AppreciationPrediction";
import AreaIntelligenceReportSection from "./components/AreaIntelligenceReport";
import { BookSiteVisitProvider } from "./components/BookSiteVisitProvider";
import BuilderIntelligence from "./components/BuilderIntelligence";
import CompareNearby from "./components/CompareNearby";
import EMIIntelligence from "./components/EMIIntelligence";
import FloorPlans from "./components/FloorPlans";
import HealthScoreDashboard from "./components/HealthScoreDashboard";
import LocationSection from "./components/LocationSection";
import PriceAnalysis from "./components/PriceAnalysis";
import ProjectTimeline from "./components/ProjectTimeline";
import PropertyAskPanel from "./components/PropertyAskPanel";
import PropertyHero from "./components/PropertyHero";
import Recommendations from "./components/Recommendations";
import RentalIntelligence from "./components/RentalIntelligence";
import ReportSidebar from "./components/ReportSidebar";
import SimilarSales from "./components/SimilarSales";

interface PropertyDetailViewProps {
  property: PropertyDetail;
}

export default function PropertyDetailView({ property }: PropertyDetailViewProps) {
  const askRef = useRef<HTMLDivElement>(null);
  const bundle = property.intelligenceBundle;

  const focusAsk = useCallback(() => {
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    if (desktop) {
      document.getElementById("property-ask-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
      return;
    }
    askRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <BookSiteVisitProvider
      propertyId={property.id}
      propertyName={property.name}
      builderName={property.builder.name}
    >
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8faf9_0%,#f5f5f5_40%,#fafafa_100%)] pt-16">
        <div className="border-b border-neutral-200/80 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                AreaIQ Intelligence Report
              </p>
              <p className="text-sm font-medium text-heading-primary line-clamp-1">
                {property.name}
              </p>
            </div>
            <p className="hidden text-xs text-muted sm:block">
              Bloomberg-grade property intelligence · Tricity
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px] lg:gap-10 xl:grid-cols-[1fr_400px]">
            <div className="min-w-0 space-y-6 sm:space-y-8">
              <PropertyHero property={property} onAskAi={focusAsk} />

              <div className="space-y-6 lg:hidden" ref={askRef}>
                <PropertyAskPanel property={property} compact />
              </div>

              <AISummary summary={property.aiSummary} />

              {bundle ? (
                <>
                  <HealthScoreDashboard scores={bundle.scores} />
                  <PriceAnalysis data={bundle.priceAnalysis} />
                  <AppreciationPrediction
                    data={bundle.appreciation}
                    currentPrice={property.price}
                  />
                  <RentalIntelligence data={bundle.rental} />
                  <EMIIntelligence
                    price={property.price}
                    expectedMonthlyRent={bundle.rental.expectedMonthlyRent}
                  />
                  <AreaIntelligenceReportSection data={bundle.area} />
                  <BuilderIntelligence data={bundle.builder} />
                  <SimilarSales data={bundle.similarSales} />
                  <CompareNearby
                    data={bundle.compareNearby}
                    current={{
                      name: property.name,
                      price: property.price,
                      area: property.area,
                      builderName: property.builder.name,
                      rental:
                        typeof property.intelligenceReport?.rentalYield.value === "number"
                          ? property.intelligenceReport.rentalYield.value
                          : null,
                      growth: bundle.scores.futureGrowth.value,
                      areaIq: bundle.scores.areaIq.value,
                    }}
                  />
                  <Recommendations items={bundle.recommendations} />
                  <ProjectTimeline data={bundle.timeline} />
                </>
              ) : null}

              <AmenitiesSection amenities={property.amenities} />
              <FloorPlans floorPlans={property.floorPlans} />
              <LocationSection property={property} />
            </div>

            <div className="hidden lg:block">
              <ReportSidebar property={property} />
            </div>
          </div>
        </div>

        <footer className="mt-12 border-t border-neutral-200 bg-neutral-900 text-muted">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
            <p className="text-sm font-semibold text-white">AreaIQ</p>
            <p className="text-center text-xs sm:text-sm">
              Property Intelligence · Powered by Tech172
            </p>
            <p className="text-xs sm:text-sm">
              © {new Date().getFullYear()} AreaIQ · Tech172 Intelligence
            </p>
          </div>
        </footer>
      </div>
    </BookSiteVisitProvider>
  );
}
