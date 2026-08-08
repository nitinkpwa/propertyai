"use client";

import dynamic from "next/dynamic";
import HomeNavbar from "./HomeNavbar";
import NotificationBar from "@/components/notifications/NotificationBar";
import TerminalHero from "./terminal/TerminalHero";

const TricityMapTerminal = dynamic(
  () => import("./terminal/TricityMapTerminal"),
  { ssr: false },
);
const FeaturedProperties = dynamic(
  () => import("./terminal/FeaturedProperties"),
);
const LiveAnalyticsSection = dynamic(
  () => import("./terminal/LiveAnalyticsSection"),
  { ssr: false },
);
const MarketGeographySection = dynamic(
  () => import("./terminal/MarketGeographySection"),
);
const TrustCapitalSection = dynamic(
  () => import("./terminal/TrustCapitalSection"),
);
const IntelligenceChartsSection = dynamic(
  () => import("./terminal/IntelligenceChartsSection"),
  { ssr: false },
);
const StructuredAISearch = dynamic(
  () => import("./terminal/StructuredAISearch"),
);
const FinalCTA = dynamic(() => import("./FinalCTA"));
const HomeFooter = dynamic(() => import("./HomeFooter"));
const FloatingAIButton = dynamic(() => import("./FloatingAIButton"), {
  ssr: false,
});
const StickyAskBar = dynamic(() => import("./StickyAskBar"), { ssr: false });

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans text-body">
      <HomeNavbar />
      <NotificationBar variant="fixed" />
      <main>
        <TerminalHero />
        <TricityMapTerminal />
        <FeaturedProperties />
        <LiveAnalyticsSection />
        <MarketGeographySection />
        <TrustCapitalSection />
        <IntelligenceChartsSection />
        <StructuredAISearch />
        <FinalCTA />
      </main>
      <HomeFooter />
      <FloatingAIButton />
      <StickyAskBar />
    </div>
  );
}
