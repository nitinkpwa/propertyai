"use client";

import { useCallback, useEffect, useRef } from "react";
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
import PendingActionResume from "./components/PendingActionResume";
import PriceAnalysis from "./components/PriceAnalysis";
import ProjectTimeline from "./components/ProjectTimeline";
import MobileActionBar from "./components/MobileActionBar";
import MobileDetailExtras from "./components/MobileDetailExtras";
import PropertyAskPanel from "./components/PropertyAskPanel";
import PropertyHero from "./components/PropertyHero";
import Recommendations from "./components/Recommendations";
import RentalIntelligence from "./components/RentalIntelligence";
import ReportSidebar from "./components/ReportSidebar";
import SimilarSales from "./components/SimilarSales";
import LegalVerificationSection from "@/components/property/LegalVerificationSection";
import SocialLinks from "@/components/common/SocialLinks";
import { Accordion, AccordionItem } from "@/components/ui/Accordion";

function AccordionWrap({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Accordion>
      <AccordionItem title={title} defaultOpen={false}>
        <div className="-mx-1">{children}</div>
      </AccordionItem>
    </Accordion>
  );
}

/** Progressive disclosure on small screens; full report on lg+. */
function ResponsiveIntel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="lg:hidden">
        <AccordionWrap title={title}>{children}</AccordionWrap>
      </div>
      <div className="hidden space-y-6 lg:block">{children}</div>
    </>
  );
}

interface PropertyDetailViewProps {
  property: PropertyDetail;
}

export default function PropertyDetailView({ property }: PropertyDetailViewProps) {
  const askRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bundle = property.intelligenceBundle;

  // Always open at hero gallery — ignore browser scroll restoration.
  useEffect(() => {
    const prev =
      typeof history !== "undefined" && "scrollRestoration" in history
        ? history.scrollRestoration
        : null;
    if (prev != null) {
      history.scrollRestoration = "manual";
    }
    // Defer one frame so layout/chrome heights settle without visible jump mid-paint.
    const id = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      topRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    });
    return () => {
      window.cancelAnimationFrame(id);
      if (prev != null) {
        history.scrollRestoration = prev;
      }
    };
  }, [property.id]);

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
      <PendingActionResume propertyId={property.id} onAskAi={focusAsk} />
      <div
        ref={topRef}
        className="min-h-screen bg-[linear-gradient(180deg,#f8faf9_0%,#f5f5f5_40%,#fafafa_100%)] pt-layout pb-layout lg:pb-0"
      >
        <div className="hidden border-b border-neutral-200/80 bg-white/80 backdrop-blur-md sm:block">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
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

        <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] lg:items-start lg:gap-8 xl:gap-10">
            <div className="min-w-0 space-y-5 sm:space-y-8 animate-page-enter">
              <PropertyHero property={property} onAskAi={focusAsk} />

              <MobileDetailExtras property={property} />

              <div className="space-y-6 lg:hidden" ref={askRef}>
                <PropertyAskPanel property={property} compact />
              </div>

              <AISummary summary={property.aiSummary} />

              <LegalVerificationSection compliance={property.legalCompliance} />

              {bundle ? (
                <>
                  <HealthScoreDashboard scores={bundle.scores} />
                  <PriceAnalysis data={bundle.priceAnalysis} />

                  <ResponsiveIntel title="Appreciation & rental outlook">
                    <AppreciationPrediction
                      data={bundle.appreciation}
                      currentPrice={property.price}
                    />
                    <RentalIntelligence data={bundle.rental} />
                  </ResponsiveIntel>

                  <div className="lg:contents">
                    <div className="lg:hidden">
                      <AccordionWrap title="EMI Calculator">
                        <EMIIntelligence
                          property={property}
                          expectedMonthlyRent={bundle.rental.expectedMonthlyRent}
                        />
                      </AccordionWrap>
                    </div>
                    <div className="hidden lg:block">
                      <EMIIntelligence
                        property={property}
                        expectedMonthlyRent={bundle.rental.expectedMonthlyRent}
                      />
                    </div>
                  </div>

                  <ResponsiveIntel title="Area & builder intelligence">
                    <AreaIntelligenceReportSection data={bundle.area} />
                    <BuilderIntelligence data={bundle.builder} />
                  </ResponsiveIntel>

                  <ResponsiveIntel title="Comparables & recommendations">
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
                  </ResponsiveIntel>
                </>
              ) : null}

              <ResponsiveIntel title="Amenities & floor plans">
                <AmenitiesSection amenities={property.amenities} />
                <FloorPlans floorPlans={property.floorPlans} />
              </ResponsiveIntel>
            </div>

            <div className="hidden min-w-0 lg:block">
              <ReportSidebar property={property} />
            </div>
          </div>

          {/* Full-bleed within content container — avoids empty right column beside map */}
          <div className="mt-5 w-full min-w-0 sm:mt-8">
            <LocationSection property={property} />
          </div>
        </div>

        <footer className="mt-8 border-t border-neutral-200 bg-neutral-900 text-muted sm:mt-10">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-5 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
            <p className="text-sm font-semibold text-white">AreaIQ</p>
            <SocialLinks variant="dark" className="text-center" />
            <div className="text-center sm:text-right">
              <p className="text-xs sm:text-sm">
                Property Intelligence · Powered by Tech172
              </p>
              <p className="mt-1 text-xs sm:text-sm">
                © {new Date().getFullYear()} AreaIQ · Tech172 Intelligence
              </p>
            </div>
          </div>
        </footer>

        <MobileActionBar property={property} />
      </div>
    </BookSiteVisitProvider>
  );
}
