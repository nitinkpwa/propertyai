/** AreaIQ enterprise brand identity — single source of truth for UI copy. */

export const BRAND = {
  name: "AreaIQ",
  company: "Tech172 Intelligence",
  poweredBy: "Powered by Tech172 Intelligence",
  poweredByShort: "Powered by Tech172",
  tagline: "AI-powered Real Estate Intelligence Platform for India.",
  trustLine: "Trusted AI platform for Real Estate Intelligence.",
  assets: {
    logo: "/logo.webp",
    hero: "/hero-banner.png",
    /** Primary tab icon — PNG master uploaded as public/favicon.png */
    favicon: "/favicon.png",
    faviconIco: "/favicon.ico",
    favicon16: "/favicon-16x16.png",
    favicon32: "/favicon-32x32.png",
    appleTouch: "/apple-touch-icon.png",
    android192: "/android-chrome-192x192.png",
    android512: "/android-chrome-512x512.png",
  },
  alt: {
    logo: "AreaIQ Powered by Tech172 Intelligence",
    hero: "AreaIQ AI-powered Real Estate Intelligence Platform",
  },
  about: {
    lead: "AreaIQ is an AI-powered Real Estate Intelligence Platform developed by Tech172 Intelligence.",
    body: "Unlike traditional property portals, AreaIQ analyzes listings using artificial intelligence, market intelligence, builder credibility, pricing trends, location data, and visual analysis to help buyers make smarter real estate decisions.",
  },
  contact: {
    addressLines: [
      "Plot No. 337,",
      "Industrial Area Phase II,",
      "Chandigarh - 160002",
    ],
    phones: ["+91 73408 79571", "+91 98178 76600"],
    email: "Tech172chd@gmail.com",
    website: "https://tech172.com",
    websiteLabel: "tech172.com",
  },
  maps: {
    /** Query-based embed tied to official BRAND.contact office address. */
    embedSrc:
      "https://www.google.com/maps?q=" +
      encodeURIComponent(
        "Tech172, Plot No. 337, Industrial Area Phase II, Chandigarh 160002",
      ) +
      "&z=16&output=embed",
    directionsUrl:
      "https://www.google.com/maps/dir/?api=1&destination=" +
      encodeURIComponent(
        "Tech172, Plot No. 337, Industrial Area Phase II, Chandigarh 160002",
      ),
    openUrl:
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(
        "Tech172, Plot No. 337, Industrial Area Phase II, Chandigarh 160002",
      ),
  },
  social: {
    areaiq: {
      facebook: "https://www.facebook.com/areaiq1",
      instagram: "https://www.instagram.com/areaiq1",
    },
    tech172: {
      facebook: "https://www.facebook.com/tech172chd",
      instagram: "https://www.instagram.com/tech172chd",
    },
  },
  products: [
    { label: "Property Intelligence", href: "/ask?q=Property+intelligence+Tricity" },
    { label: "Market Intelligence", href: "/ask?q=Market+intelligence+Tricity" },
    { label: "AI Copilot", href: "/ask" },
    { label: "Builder Intelligence", href: "/ask?q=Builder+intelligence+Tricity" },
    { label: "Investment Analysis", href: "/ask?q=Investment+analysis+Tricity" },
  ],
  /** Primary product names — never use "AI Assistant", "AI Chat", or "Chat Bot". */
  productsNames: {
    intelligence: "AreaIQ Intelligence",
    copilot: "AreaIQ Copilot",
    engine: "AreaIQ Intelligence Engine",
    property: "AreaIQ Property Intelligence",
    market: "AreaIQ Market Intelligence",
  },
  meta: {
    title: "AreaIQ | Powered by Tech172 Intelligence",
    description:
      "India's AI-powered Real Estate Intelligence Platform. Analyze properties, builders, areas, investments, pricing trends, and market insights with AreaIQ by Tech172 Intelligence.",
  },
  copyright: (year: number) =>
    `© ${year} AreaIQ. Powered by Tech172 Intelligence. All Rights Reserved.`,
  analyzingSignals: [
    "Live Properties",
    "Area Intelligence",
    "Builder Intelligence",
    "Market Trends",
    "Investment Opportunities",
  ],
} as const;
