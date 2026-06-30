"use client";

import AiDemoSection from "./AiDemoSection";
import AreaComparisonCards from "./AreaComparisonCards";
import ExploreTricityMap from "./ExploreTricityMap";
import FinalCTA from "./FinalCTA";
import HomeFooter from "./HomeFooter";
import HomeHero from "./HomeHero";
import HomeNavbar from "./HomeNavbar";
import InsightsSection from "./InsightsSection";
import InvestmentCalculators from "./InvestmentCalculators";
import MarketTicker from "./MarketTicker";
import PopularSearches from "./PopularSearches";
import RecommendationsCarousel from "./RecommendationsCarousel";
import SellerCTA from "./SellerCTA";
import TricityToday from "./TricityToday";
import TrustedBuildersCarousel from "./TrustedBuildersCarousel";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900">
      <MarketTicker />
      <HomeNavbar />
      <main>
        <HomeHero />
        <TricityToday />
        <RecommendationsCarousel />
        <TrustedBuildersCarousel />
        <ExploreTricityMap />
        <AreaComparisonCards />
        <InvestmentCalculators />
        <AiDemoSection />
        <InsightsSection />
        <PopularSearches />
        <SellerCTA />
        <FinalCTA />
      </main>
      <HomeFooter />
    </div>
  );
}
