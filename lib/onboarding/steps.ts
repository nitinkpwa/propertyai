import { HOME_NAV_LINKS } from "@/app/components/home/data";
import type { PlacementSide } from "@/lib/onboarding/positioning";

export type TourPlacement = PlacementSide | "auto";

export type TourStep = {
  id: string;
  title: string;
  description: string;
  tip?: string;
  /** Desktop / default selectors tried in order */
  selectors?: string[];
  /** Prefer these on mobile/tablet when present */
  mobileSelectors?: string[];
  /** Alias: same as selectors (desktop) */
  desktopTarget?: string | string[];
  /** Alias: same as mobileSelectors */
  mobileTarget?: string | string[];
  placement?: TourPlacement;
  requirePath?: string;
  primaryLabel?: string;
  hideBack?: boolean;
  resolveDescription?: () => string;
  /** Scroll alignment for this target */
  scrollAlign?: "start" | "center" | "upper";
  /** Cap spotlight height so huge sections don't flood the viewport */
  maxSpotlightHeight?: number;
};

function asList(v?: string | string[]): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

/** Resolve desktop vs mobile selectors for a step (aliases supported). */
export function stepSelectors(
  step: TourStep,
  mode: "mobile" | "tablet" | "desktop",
): string[] {
  const desktop = [...asList(step.desktopTarget), ...(step.selectors ?? [])];
  const mobile = [...asList(step.mobileTarget), ...(step.mobileSelectors ?? [])];
  if ((mode === "mobile" || mode === "tablet") && mobile.length) return mobile;
  return desktop;
}

function navDescription(): string {
  const labels = HOME_NAV_LINKS.map((l) => l.label).join(" · ");
  return `Jump between ${labels}.`;
}

function mobileNavDescription(): string {
  if (typeof window === "undefined") {
    return "Use the bottom navigation to move between Home, Explore, Ask AI, and more.";
  }
  if (window.matchMedia("(min-width: 1024px)").matches) {
    return navDescription();
  }
  return "Use the bottom navigation to move between Home, Explore, Ask AI, and more.";
}

function listPropertyDescription(): string {
  if (typeof window === "undefined") {
    return "Owners and partners can list properties through the menu.";
  }
  if (window.matchMedia("(min-width: 640px)").matches) {
    return "Owners and partners can submit properties to AreaIQ for listing and discovery.";
  }
  return "Owners and partners can list properties through the menu.";
}

function mobileMenuDescription(): string {
  if (typeof window === "undefined") {
    return "Tap the menu for more AreaIQ tools and account options.";
  }
  const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
  if (isDesktop) {
    return "Your account menu opens dashboards, profile settings, and more AreaIQ tools.";
  }
  return "Tap the menu to see Explore, Intelligence, Properties, Connect, List Property, and Sign In.";
}

function accountDescription(signedIn: boolean): string {
  if (signedIn) {
    return "You're already signed in. Manage saved properties, visits, and inquiries from your account.";
  }
  if (typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches) {
    return "Open the menu to sign in and manage saved properties, visits, and inquiries.";
  }
  return "Sign in to manage saved properties, visits, inquiries, and personalized activity.";
}

export function buildOnboardingSteps(options?: {
  signedIn?: boolean;
}): TourStep[] {
  const signedIn = Boolean(options?.signedIn);

  return [
    {
      id: "welcome",
      title: "Welcome to AreaIQ",
      description:
        "Your intelligent real estate marketplace for discovering properties, understanding locations, and making smarter decisions.\n\nLet us show you around.",
      placement: "center",
      requirePath: "/",
      primaryLabel: "Start Tour",
      hideBack: true,
    },
    {
      id: "search",
      title: "Start with a question",
      description:
        "Ask in natural language — location, budget, property type, or investment goal — and AreaIQ helps find the right options.",
      tip: "Try: 3 BHK under ₹1.5 Cr in Mohali",
      selectors: ['[data-tour="terminal-search"]', "#terminal-ai-search"],
      requirePath: "/",
      placement: "bottom",
      scrollAlign: "upper",
    },
    {
      id: "properties",
      title: "Explore properties",
      description:
        "Browse verified listings with price, location, builder, and AreaIQ intelligence. View, compare, save, ask AI, or book a visit.",
      selectors: [
        '[data-tour="property-card"]',
        '[data-tour="featured-properties"]',
      ],
      mobileSelectors: [
        '[data-tour="property-card"]',
        '[data-tour="featured-properties"]',
      ],
      requirePath: "/",
      placement: "auto",
      scrollAlign: "upper",
      maxSpotlightHeight: 420,
    },
    {
      id: "intelligence-map",
      title: "See the market on a map",
      description:
        "Explore Tricity locations visually. Switch areas, discover nearby properties, and understand the market at a glance.",
      tip: "Swipe or scroll to explore the map.",
      selectors: [
        '[data-tour="intelligence-map"]',
        '[data-tour="intelligence-map-areas"]',
        '[data-tour="intelligence-map-section"]',
      ],
      mobileSelectors: [
        '[data-tour="intelligence-map-areas"]',
        '[data-tour="intelligence-map"]',
        '[data-tour="intelligence-map-section"]',
      ],
      requirePath: "/",
      placement: "auto",
      scrollAlign: "upper",
      maxSpotlightHeight: 280,
    },
    {
      id: "location-intelligence",
      title: "Understand every area",
      description:
        "Each location has its own intelligence — score, confidence, pricing, demand, builders, and inventory.",
      tip: "Areas update live — Mohali, Dhakoli, Peer Muchalla, Panchkula, Zirakpur, and more.",
      selectors: [
        '[data-tour="intelligence-panel"]',
        '[data-tour="intelligence-map-areas"]',
        '[data-tour="intelligence-map-section"]',
      ],
      mobileSelectors: [
        '[data-tour="intelligence-panel"]',
        '[data-tour="intelligence-map-areas"]',
      ],
      requirePath: "/",
      placement: "left",
      scrollAlign: "upper",
      maxSpotlightHeight: 360,
    },
    {
      id: "property-card",
      title: "Every property has context",
      description:
        "See price, configuration, location, builder, verification, and AreaIQ scores before you decide.",
      tip: "Use Book Visit, Ask AI, Compare, and Save on the card.",
      selectors: ['[data-tour="property-card"]'],
      requirePath: "/",
      placement: "auto",
      scrollAlign: "upper",
      maxSpotlightHeight: 440,
    },
    {
      id: "compare",
      title: "Compare before you decide",
      description:
        "Shortlist properties and compare them side-by-side — no more jumping between tabs.",
      selectors: [
        '[data-tour="property-card"] [data-tour="card-compare"]',
        '[data-tour="card-compare"]',
      ],
      requirePath: "/",
      placement: "auto",
      scrollAlign: "upper",
    },
    {
      id: "ask-ai",
      title: "Ask AreaIQ",
      description:
        "Ask about pricing, location, investment potential, or property details — a core AreaIQ feature.",
      selectors: [
        '[data-tour="property-card"] [data-tour="card-ask-ai"]',
        '[data-tour="card-ask-ai"]',
        '[data-tour="floating-ask-ai"]',
      ],
      requirePath: "/",
      placement: "auto",
      scrollAlign: "upper",
    },
    {
      id: "book-visit",
      title: "Book a site visit",
      description:
        "Request a site visit directly from a property. AreaIQ helps you manage the request afterward.",
      selectors: [
        '[data-tour="property-card"] [data-tour="card-book-visit"]',
        '[data-tour="card-book-visit"]',
      ],
      requirePath: "/",
      placement: "auto",
      scrollAlign: "upper",
    },
    {
      id: "navigation",
      title: "Your main navigation",
      description: navDescription(),
      resolveDescription: mobileNavDescription,
      desktopTarget: [
        '[data-tour="desktop-navigation"]',
        '[data-tour="home-navbar-nav"]',
      ],
      mobileTarget: [
        '[data-tour="public-bottom-nav"]',
        '[data-tour="mobile-menu"]',
        '[data-tour="mobile-menu-button"]',
      ],
      requirePath: "/",
      placement: "bottom",
      scrollAlign: "start",
    },
    {
      id: "list-property",
      title: "Have a property to sell?",
      description: listPropertyDescription(),
      resolveDescription: listPropertyDescription,
      desktopTarget: ['[data-tour="list-property"]'],
      mobileTarget: [
        '[data-tour="mobile-menu"]',
        '[data-tour="mobile-menu-button"]',
      ],
      requirePath: "/",
      placement: "bottom",
      scrollAlign: "start",
    },
    {
      id: "account",
      title: "Your AreaIQ account",
      description: accountDescription(signedIn),
      resolveDescription: () => accountDescription(signedIn),
      desktopTarget: signedIn
        ? ['[data-tour="user-menu"]', '[data-tour="sign-in"]']
        : ['[data-tour="sign-in"]', '[data-tour="user-menu"]'],
      mobileTarget: [
        '[data-tour="mobile-menu"]',
        '[data-tour="mobile-menu-button"]',
      ],
      requirePath: "/",
      placement: "bottom",
      scrollAlign: "start",
    },
    {
      id: "more-menu",
      title: "More tools",
      description: mobileMenuDescription(),
      resolveDescription: mobileMenuDescription,
      desktopTarget: [
        '[data-tour="user-menu"]',
        '[data-tour="mobile-menu"]',
        '[data-tour="mobile-menu-button"]',
      ],
      mobileTarget: [
        '[data-tour="mobile-menu"]',
        '[data-tour="mobile-menu-button"]',
      ],
      requirePath: "/",
      placement: "bottom",
      scrollAlign: "start",
    },
    {
      id: "finish",
      title: "You're ready.",
      description:
        "Explore properties, understand the market, and use AreaIQ intelligence to make smarter real estate decisions.",
      placement: "center",
      requirePath: "/",
      primaryLabel: "Start Exploring →",
    },
  ];
}
