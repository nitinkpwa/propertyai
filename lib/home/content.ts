import type { HeroUspItem, PopularQuestion, SearchChip, WhyAreaIQItem } from "./types";

export const HERO_SEARCH_CHIPS: SearchChip[] = [
  { id: "first-home", label: "First Home", href: "/ask?q=First+home+buyer+guide+Tricity" },
  { id: "investment", label: "Investment", href: "/ask?q=Best+investment+properties+Tricity" },
  { id: "luxury", label: "Luxury", href: "/ask?q=Luxury+3BHK+under+2+Crore+Tricity" },
  { id: "nri", label: "NRI", href: "/ask?q=NRI+property+investment+Tricity" },
  { id: "commercial", label: "Commercial", href: "/ask?q=Best+commercial+project+Tricity" },
  { id: "villa", label: "Villa", href: "/ask?q=Best+villa+projects+Tricity" },
  { id: "builder-floor", label: "Builder Floor", href: "/ask?q=Builder+floor+Tricity" },
  { id: "rental", label: "Rental Income", href: "/ask?q=Highest+rental+yield+Tricity" },
  { id: "ready", label: "Ready to Move", href: "/properties?type=buy" },
  { id: "upcoming", label: "Upcoming", href: "/ask?q=Upcoming+projects+Tricity" },
  { id: "family", label: "Family", href: "/ask?q=Family+friendly+3BHK+Tricity" },
  { id: "senior", label: "Senior Living", href: "/ask?q=Senior+living+Tricity" },
];

export const HERO_PLACEHOLDERS = [
  "I have ₹1.5 Cr. Where should I invest?",
  "Best Villas near Airport Road",
  "Luxury 3BHK under ₹2Cr",
  "Properties with highest rental yield",
  "Compare Omaxe vs Smart World",
] as const;

/** Hero “Why AreaIQ?” USPs — first-screen differentiation vs portals/brokers. */
export const HERO_USP_ITEMS: HeroUspItem[] = [
  {
    id: "ai-search",
    eyebrow: "AI Powered Property Search",
    title: "Easy Property Search with AI",
    description:
      "Describe your requirements in natural language and let AreaIQ find the right property for you.",
  },
  {
    id: "direct-connect",
    eyebrow: "No Broker. Direct Connect.",
    title: "Connect Directly with Builders & Sellers",
    description:
      "No unnecessary middlemen. Talk directly with verified builders or property owners.",
  },
  {
    id: "verified",
    eyebrow: "Verified Listings Only",
    title: "Verified Properties Only",
    description:
      "Every listing is verified before it appears on AreaIQ to reduce fake or misleading properties.",
  },
];

export const POPULAR_AI_QUESTIONS: PopularQuestion[] = [
  { id: "mohali", question: "Is Mohali overpriced?", href: "/ask?q=Is+Mohali+overpriced" },
  { id: "buy-now", question: "Should I buy now or wait?", href: "/ask?q=Should+I+buy+now+or+wait+Tricity" },
  { id: "builder", question: "Which builder is most reliable?", href: "/ask?q=Most+reliable+builder+Tricity" },
  { id: "rise", question: "Where will prices rise fastest?", href: "/ask?q=Where+will+prices+rise+fastest+Tricity" },
  { id: "compare", question: "Compare PR7 vs New Chandigarh", href: "/ask?q=Compare+PR7+vs+New+Chandigarh" },
  { id: "under-2cr", question: "Best projects below ₹2Cr", href: "/ask?q=Best+projects+below+2+Crore+Tricity" },
  { id: "yield", question: "Highest rental yield", href: "/ask?q=Highest+rental+yield+Tricity" },
  { id: "safe", question: "Safest investment", href: "/ask?q=Safest+property+investment+Tricity" },
  { id: "commercial", question: "Best commercial project", href: "/ask?q=Best+commercial+project+Tricity" },
  { id: "villa", question: "Best villa project", href: "/ask?q=Best+villa+project+Tricity" },
];

export const WHY_AREAIQ_ITEMS: WhyAreaIQItem[] = [
  {
    id: "area",
    title: "Area Intelligence",
    description: "Understand micro-markets before you commit.",
    href: "/ask?q=Area+intelligence+Tricity",
  },
  {
    id: "builder",
    title: "Builder Intelligence",
    description: "Delivery record and trust — not brochures.",
    href: "/ask?q=Compare+builders+Tricity",
  },
  {
    id: "price",
    title: "Price Prediction",
    description: "Ask AreaIQ about appreciation outlook.",
    href: "/ask?q=Price+appreciation+outlook+Tricity",
  },
  {
    id: "assistant",
    title: "AreaIQ Copilot",
    description: "Natural language. Verified intelligence answers.",
    href: "/ask",
  },
  {
    id: "compare",
    title: "Property Comparison",
    description: "Compare projects side by side.",
    href: "/ask?q=Compare+two+projects+Tricity",
  },
  {
    id: "verified",
    title: "Verified Listings",
    description: "Browse inventory grounded in our database.",
    href: "/properties",
  },
  {
    id: "investment",
    title: "Investment Analysis",
    description: "Yield, growth, and risk in one conversation.",
    href: "/ask?q=Best+investment+analysis+Tricity",
  },
  {
    id: "trends",
    title: "Market Trends",
    description: "Ask what’s moving across Tricity.",
    href: "/ask?q=Latest+Tricity+market+trends",
  },
  {
    id: "mortgage",
    title: "Mortgage Intelligence",
    description: "EMI and affordability guidance.",
    href: "/ask?q=Calculate+EMI+for+1.5+Crore+home+loan",
  },
  {
    id: "legal",
    title: "Legal Verification",
    description: "Ask about RERA and due diligence.",
    href: "/ask?q=RERA+and+legal+checks+Tricity",
  },
];

export const FLOATING_AI_ACTIONS = [
  { id: "invest", label: "Find investment", href: "/ask?q=Best+investment+under+1.5+Crore+Tricity" },
  { id: "builders", label: "Compare builders", href: "/ask?q=Compare+builders+Tricity" },
  { id: "explain", label: "Explain project", href: "/ask?q=Explain+a+project+in+Aerocity" },
  { id: "emi", label: "Calculate EMI", href: "/ask?q=Calculate+EMI+for+1.2+Crore+loan" },
  { id: "appreciate", label: "Show appreciation", href: "/ask?q=Areas+with+highest+appreciation+Tricity" },
  { id: "visit", label: "Book visit", href: "/properties" },
] as const;
