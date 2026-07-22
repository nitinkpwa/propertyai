"use client";

import dynamic from "next/dynamic";
import HomeHero from "./HomeHero";
import HomeNavbar from "./HomeNavbar";
import NotificationBar from "@/components/notifications/NotificationBar";
import WelcomeTribute from "@/components/tribute/WelcomeTribute";

const PopularAIQuestions = dynamic(() => import("./sections/PopularAIQuestions"));
const MarketIntelligenceSection = dynamic(() => import("./sections/MarketIntelligenceSection"));
const FeaturedIntelligenceCarousel = dynamic(() => import("./FeaturedIntelligenceCarousel"));
const WhyAreaIQSection = dynamic(() => import("./sections/WhyAreaIQSection"));
const AboutAreaIQSection = dynamic(() => import("./sections/AboutAreaIQSection"));
const ExploreAreasSection = dynamic(() => import("./sections/ExploreAreasSection"));
const BuilderIntelligenceSection = dynamic(() => import("./sections/BuilderIntelligenceSection"));
const FinalCTA = dynamic(() => import("./FinalCTA"));
const HomeFooter = dynamic(() => import("./HomeFooter"));
const FloatingAIButton = dynamic(() => import("./FloatingAIButton"), { ssr: false });
const StickyAskBar = dynamic(() => import("./StickyAskBar"), { ssr: false });

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-sans text-body">
      <WelcomeTribute />
      <HomeNavbar />
      <NotificationBar variant="fixed" />
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
