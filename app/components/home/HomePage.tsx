"use client";

import CapabilitiesSection from "./sections/CapabilitiesSection";
import MarketIntelligenceSection from "./sections/MarketIntelligenceSection";
import RecommendationsCarousel from "./RecommendationsCarousel";
import PropertyComparisonSection from "./sections/PropertyComparisonSection";
import BuilderIntelligenceSection from "./sections/BuilderIntelligenceSection";
import ExploreAreasSection from "./sections/ExploreAreasSection";
import InvestmentHeatmapSection from "./sections/InvestmentHeatmapSection";
import AIAssistantShowcase from "./sections/AIAssistantShowcase";
import BuyerJourneySection from "./sections/BuyerJourneySection";
import SellerBuilderJourneySection from "./sections/SellerBuilderJourneySection";
import ConnectSection from "./sections/ConnectSection";
import TestimonialsSection from "./sections/TestimonialsSection";
import NewsIntelligenceSection from "./sections/NewsIntelligenceSection";
import EcosystemSection from "./sections/EcosystemSection";
import FloatingAIButton from "./FloatingAIButton";
import StickyAskBar from "./StickyAskBar";
import FinalCTA from "./FinalCTA";
import HomeFooter from "./HomeFooter";
import HomeHero from "./HomeHero";
import HomeNavbar from "./HomeNavbar";
import MarketTicker from "./MarketTicker";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-sans text-body">
      <MarketTicker />
      <HomeNavbar />
      <main>
        <HomeHero />
        <CapabilitiesSection />
        <MarketIntelligenceSection />
        <RecommendationsCarousel />
        <PropertyComparisonSection />
        <BuilderIntelligenceSection />
        <ExploreAreasSection />
        <InvestmentHeatmapSection />
        <AIAssistantShowcase />
        <BuyerJourneySection />
        <SellerBuilderJourneySection />
        <ConnectSection />
        <TestimonialsSection />
        <NewsIntelligenceSection />
        <EcosystemSection />
        <FinalCTA />
      </main>
      <HomeFooter />
      <FloatingAIButton />
      <StickyAskBar />
    </div>
  );
}
