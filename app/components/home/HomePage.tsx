"use client";

import dynamic from "next/dynamic";
import FloatingAIButton from "./FloatingAIButton";
import StickyAskBar from "./StickyAskBar";
import HomeFooter from "./HomeFooter";
import HomeHero from "./HomeHero";
import HomeNavbar from "./HomeNavbar";
import MarketTicker from "./MarketTicker";

const PopularAIQuestions = dynamic(() => import("./sections/PopularAIQuestions"));
const MarketIntelligenceSection = dynamic(() => import("./sections/MarketIntelligenceSection"));
const FeaturedIntelligenceCarousel = dynamic(() => import("./FeaturedIntelligenceCarousel"));
const WhyAreaIQSection = dynamic(() => import("./sections/WhyAreaIQSection"));
const AboutAreaIQSection = dynamic(() => import("./sections/AboutAreaIQSection"));
const ExploreAreasSection = dynamic(() => import("./sections/ExploreAreasSection"));
const BuilderIntelligenceSection = dynamic(() => import("./sections/BuilderIntelligenceSection"));
const FinalCTA = dynamic(() => import("./FinalCTA"));

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-sans text-body">
      <MarketTicker />
      <HomeNavbar />
      <main>
        <HomeHero />
        <PopularAIQuestions />
        <MarketIntelligenceSection />
        <FeaturedIntelligenceCarousel />
        <WhyAreaIQSection />
        <AboutAreaIQSection />
        <ExploreAreasSection />
        <BuilderIntelligenceSection />
        <FinalCTA />
      </main>
      <HomeFooter />
      <FloatingAIButton />
      <StickyAskBar />
    </div>
  );
}
