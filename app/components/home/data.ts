export const LOCATIONS = [
  "Chandigarh",
  "Mohali",
  "Panchkula",
  "Zirakpur",
  "Kharar",
  "New Chandigarh",
  "Aerocity",
  "IT City",
];

export const BUDGETS = [
  { label: "Under ₹30L", min: 0, max: 3000000 },
  { label: "₹30L–₹60L", min: 3000000, max: 6000000 },
  { label: "₹60L–₹1Cr", min: 6000000, max: 10000000 },
  { label: "₹1Cr–₹2Cr", min: 10000000, max: 20000000 },
  { label: "Above ₹2Cr", min: 20000000, max: 999999999 },
];

export const AI_EXAMPLE_PROMPTS = [
  "I'm looking for a 3BHK under ₹90 lakh near IT City Mohali with good rental yield and reputed builder.",
  "Should I buy now or wait?",
  "Best investment under ₹80 lakh",
  "Future of PR7",
  "Compare Sushma vs Omaxe",
  "Highest rental yield",
  "Safest builder",
  "Which area has highest appreciation?",
  "Should I buy plot or apartment?",
  "Best commercial investment",
  "Loan eligibility",
  "Nearby schools",
  "Flood risk",
  "Traffic",
  "Metro impact",
];

export const SUGGESTION_CHIPS = [
  { label: "Investment", href: "/ask?q=Best+investment+properties+Tricity", icon: "📈" },
  { label: "Ready to Move", href: "/properties?type=buy", icon: "🏠" },
  { label: "Luxury", href: "/properties?type=buy&min=20000000", icon: "✨" },
  { label: "Commercial", href: "/properties?type=commercial", icon: "🏢" },
  { label: "Office", href: "/ask?q=Office+space+Tricity", icon: "💼" },
  { label: "Retail", href: "/ask?q=Retail+investment+Tricity", icon: "🛍️" },
  { label: "Villa", href: "/ask?q=Villa+projects+Tricity", icon: "🏡" },
  { label: "Builder Floor", href: "/ask?q=Builder+floor+Tricity", icon: "🏗️" },
  { label: "Plots", href: "/ask?q=Plot+investment+Tricity", icon: "📐" },
  { label: "Rental Income", href: "/ask?q=Highest+rental+yield+Tricity", icon: "💰" },
  { label: "NRI", href: "/ask?q=NRI+property+investment+Tricity", icon: "🌍" },
  { label: "Family Home", href: "/ask?q=Family+friendly+3BHK+Tricity", icon: "👨‍👩‍👧" },
  { label: "Senior Living", href: "/ask?q=Senior+living+Tricity", icon: "🧓" },
  { label: "First Home", href: "/ask?q=First+home+buyer+guide+Tricity", icon: "🔑" },
];

export const SMART_CHIPS = SUGGESTION_CHIPS;

export const HERO_CAPABILITIES = [
  "find properties",
  "compare projects",
  "compare builders",
  "suggest areas",
  "calculate investment returns",
  "explain legal risks",
  "recommend site visits",
];

export const AI_CAPABILITIES = [
  { title: "Find property using natural language", icon: "💬", href: "/ask" },
  { title: "Compare builders", icon: "🏗️", href: "/ask?q=Compare+builders+Tricity" },
  { title: "Compare projects", icon: "⚖️", href: "/ask?q=Compare+two+projects+Tricity" },
  { title: "Predict appreciation", icon: "📈", href: "/ask?q=Areas+with+highest+appreciation+Tricity" },
  { title: "Rental yield analysis", icon: "🏠", href: "/ask?q=Highest+rental+yield+Tricity" },
  { title: "Fair price estimation", icon: "💰", href: "/ask?q=Is+this+property+fairly+priced" },
  { title: "Detect overpriced listings", icon: "🔍", href: "/ask?q=Overpriced+listings+Tricity" },
  { title: "Legal guidance", icon: "⚖️", href: "/ask?q=Legal+risks+buying+property+Tricity" },
  { title: "RERA verification", icon: "✅", href: "/ask?q=RERA+verified+projects+Tricity" },
  { title: "Loan calculation", icon: "🧮", href: "/ask?q=Home+loan+EMI+calculation" },
  { title: "Negotiation recommendation", icon: "🤝", href: "/ask?q=How+to+negotiate+property+price" },
  { title: "Area intelligence", icon: "📍", href: "/ask?q=Area+intelligence+Mohali" },
  { title: "Future infrastructure impact", icon: "🚇", href: "/ask?q=Metro+impact+on+property+prices+Tricity" },
  { title: "Investment score", icon: "✦", href: "/ask?q=Best+investment+score+areas+Tricity" },
  { title: "Site visit recommendations", icon: "📅", href: "/buyer/site-visits" },
  { title: "Construction quality analysis", icon: "🔬", href: "/ask?q=Construction+quality+builder+review" },
];

/** MVP Zero-Level: no fabricated market counts — explore via AreaIQ */
export const MARKET_INTELLIGENCE_CARDS = [
  { label: "New Launches", value: "—", trend: "Ask AreaIQ", icon: "🚀", href: "/ask?q=New+launch+projects+Tricity" },
  { label: "Price Drops", value: "—", trend: "Ask AreaIQ", icon: "📉", href: "/ask?q=Properties+with+price+drops+Tricity" },
  { label: "Builder Offers", value: "—", trend: "Ask AreaIQ", icon: "🎁", href: "/ask?q=Current+builder+offers+Tricity" },
  { label: "Rental Yield", value: "—", trend: "Ask AreaIQ", icon: "🏠", href: "/ask?q=Aerocity+rental+yield" },
  { label: "Price Growth", value: "—", trend: "Ask AreaIQ", icon: "📈", href: "/ask?q=Mohali+price+trends" },
  { label: "Infrastructure", value: "—", trend: "Ask AreaIQ", icon: "🏗️", href: "/ask?q=Infrastructure+updates+Tricity" },
  { label: "GMADA", value: "—", trend: "Ask AreaIQ", icon: "🏛️", href: "/ask?q=GMADA+approved+projects" },
  { label: "Metro", value: "—", trend: "Ask AreaIQ", icon: "🚇", href: "/ask?q=Metro+impact+Tricity+property" },
  { label: "PR7", value: "—", trend: "Ask AreaIQ", icon: "✈️", href: "/ask?q=PR7+Airport+Road+outlook" },
  { label: "Airport", value: "—", trend: "Ask AreaIQ", icon: "🛫", href: "/ask?q=Airport+road+property+investment" },
  { label: "Ring Road", value: "—", trend: "Ask AreaIQ", icon: "🛣️", href: "/ask?q=Ring+road+impact+Tricity" },
];

export const BUILDER_INTELLIGENCE = [
  { name: "Sushma", trustScore: 88, completed: 14, delayed: 1, quality: 85, satisfaction: 4.2, href: "/ask?q=Sushma+builder+review+Tricity" },
  { name: "Omaxe", trustScore: 82, completed: 22, delayed: 3, quality: 80, satisfaction: 4.0, href: "/ask?q=Omaxe+builder+review+Tricity" },
  { name: "DLF", trustScore: 94, completed: 8, delayed: 0, quality: 92, satisfaction: 4.6, href: "/ask?q=DLF+projects+Tricity" },
  { name: "Hero Homes", trustScore: 86, completed: 11, delayed: 2, quality: 84, satisfaction: 4.1, href: "/ask?q=Hero+Homes+Tricity" },
  { name: "SBP Group", trustScore: 79, completed: 9, delayed: 2, quality: 78, satisfaction: 3.9, href: "/ask?q=SBP+Group+Tricity" },
  { name: "Aura", trustScore: 81, completed: 6, delayed: 1, quality: 83, satisfaction: 4.0, href: "/ask?q=Aura+developer+Tricity" },
];

export const EXPLORE_AREAS_EXTENDED = [
  { name: "Mohali", score: 88, tag: "IT hub", href: "/ask?q=Mohali+area+intelligence" },
  { name: "Aerocity", score: 92, tag: "Airport corridor", href: "/ask?q=Aerocity+area+intelligence" },
  { name: "New Chandigarh", score: 87, tag: "Master planned", href: "/ask?q=New+Chandigarh+area+intelligence" },
  { name: "Zirakpur", score: 85, tag: "Value segment", href: "/ask?q=Zirakpur+area+intelligence" },
  { name: "Panchkula", score: 74, tag: "Established", href: "/ask?q=Panchkula+area+intelligence" },
  { name: "PR7", score: 90, tag: "High growth", href: "/ask?q=PR7+area+intelligence" },
  { name: "IT City", score: 89, tag: "Employment hub", href: "/ask?q=IT+City+Mohali+intelligence" },
  { name: "Banur", score: 76, tag: "Emerging", href: "/ask?q=Banur+area+intelligence" },
  { name: "Derabassi", score: 72, tag: "Industrial", href: "/ask?q=Derabassi+area+intelligence" },
];

export const HEATMAP_ZONES = [
  { area: "Aerocity", status: "Hot" as const, reason: "Airport expansion + commercial demand", href: "/ask?q=Aerocity+investment+outlook" },
  { area: "PR7 Corridor", status: "Hot" as const, reason: "Infrastructure pipeline driving appreciation", href: "/ask?q=PR7+investment+outlook" },
  { area: "IT City Mohali", status: "Growing" as const, reason: "Employment hub with steady rental demand", href: "/ask?q=IT+City+Mohali+investment" },
  { area: "New Chandigarh", status: "Growing" as const, reason: "Planned development with selective upside", href: "/ask?q=New+Chandigarh+investment" },
  { area: "Panchkula", status: "Stable" as const, reason: "Mature market with predictable returns", href: "/ask?q=Panchkula+investment+outlook" },
  { area: "Overbuilt corridors", status: "Avoid" as const, reason: "Supply exceeds demand in select pockets", href: "/ask?q=Areas+to+avoid+Tricity+investment" },
];

export const AI_CONVERSATION_EXAMPLES = [
  { q: "Can I negotiate this price?", a: "Based on comparable sales, there's 4–6% room. Here's your strategy…" },
  { q: "Is this overpriced?", a: "This listing is 8% above fair value for the micro-market. Alternatives inside budget…" },
  { q: "Best schools nearby?", a: "Within 3 km: DPS, Gurukul Global, and Ryan International — ratings attached." },
  { q: "Flood risk?", a: "This sector has low flood risk. Drainage upgrades planned for 2027." },
  { q: "Future appreciation?", a: "Projected 12–15% over 3 years based on infra and demand signals." },
  { q: "Builder trustworthy?", a: "Trust score 88/100 — 14 delivered, 1 delayed project, strong RERA record." },
  { q: "Loan EMI?", a: "At ₹85L loan, 20 years, 8.5% — EMI ≈ ₹73,800/month. Eligibility checklist…" },
  { q: "Water supply?", a: "Municipal + borewell backup. Summer supply stable per resident feedback." },
  { q: "Traffic?", a: "Peak-hour 25 min to IT City. PR7 widening will reduce this by ~30%." },
  { q: "Legal issues?", a: "RERA registered, clear title. Verify society NOC before token." },
];

export const BUYER_JOURNEY = [
  { step: 1, title: "Requirements", desc: "Tell AreaIQ what you need in plain language", href: "/ask", icon: "💬" },
  { step: 2, title: "Discover Areas", desc: "AI maps the best micro-markets for your goals", href: "/ask?q=Best+areas+for+my+budget+Tricity", icon: "📍" },
  { step: 3, title: "AI Recommendations", desc: "Curated properties matched to your profile", href: "/properties?type=buy", icon: "✦" },
  { step: 4, title: "Compare Properties", desc: "Side-by-side builder, price, and ROI analysis", href: "/ask?q=Compare+two+properties+Tricity", icon: "⚖️" },
  { step: 5, title: "Financial Planning", desc: "EMI, affordability, and investment returns", href: "/ask?q=Home+loan+and+affordability+calculation", icon: "🧮" },
  { step: 6, title: "Site Visits", desc: "Book verified visits with Connect Partners", href: "/buyer/site-visits", icon: "📅" },
  { step: 7, title: "Legal Verification", desc: "RERA, title, and documentation checks", href: "/ask?q=Legal+verification+checklist+buying+property", icon: "⚖️" },
  { step: 8, title: "Negotiation", desc: "AI-backed negotiation strategy", href: "/ask?q=How+to+negotiate+property+price+Tricity", icon: "🤝" },
  { step: 9, title: "Loan Process", desc: "Bank comparison and eligibility guidance", href: "/ask?q=Home+loan+bank+comparison+Tricity", icon: "🏦" },
  { step: 10, title: "Purchase", desc: "Close with confidence — you knew before you bought", href: "/buyer", icon: "🔑" },
];

export const SELLER_JOURNEY = [
  { title: "List property", desc: "Upload facts — AreaIQ handles the intelligence", href: "/seller", icon: "📝" },
  { title: "AI creates description", desc: "Buyer-ready copy from structured data", href: "/seller", icon: "✦" },
  { title: "AI prices property", desc: "Fair value based on market comparables", href: "/ask?q=How+to+price+my+property+fairly", icon: "💰" },
  { title: "AI SEO", desc: "Optimized for search and discovery", href: "/seller", icon: "🔍" },
  { title: "Optional Connect Partners", desc: "Partners assist only when assigned", href: "/connect", icon: "🤝" },
  { title: "Verified buyers", desc: "Qualified leads routed to your partner", href: "/seller", icon: "👥" },
  { title: "Site visits", desc: "Scheduled and tracked in CRM", href: "/seller", icon: "📅" },
  { title: "Offer management", desc: "Negotiate and close with intelligence", href: "/seller", icon: "✅" },
];

export const BUILDER_JOURNEY = [
  { title: "Inventory upload", desc: "Bulk or project-wise listing", href: "/seller", icon: "📦" },
  { title: "AI enrichment", desc: "Scores, insights, and market positioning", href: "/ask?q=AI+property+enrichment", icon: "✦" },
  { title: "AI descriptions", desc: "Premium buyer-facing copy at scale", href: "/seller", icon: "📝" },
  { title: "Area intelligence", desc: "Micro-market reports per project", href: "/ask?q=Area+intelligence+for+builders", icon: "📍" },
  { title: "Lead routing", desc: "Qualified buyers to Connect Partners", href: "/connect", icon: "🔗" },
  { title: "Connect Partner", desc: "Dedicated CRM per project", href: "/connect", icon: "🤝" },
  { title: "Analytics", desc: "Demand, visits, and conversion tracking", href: "/seller", icon: "📊" },
];

export const TESTIMONIALS = [
  { quote: "AreaIQ saved me ₹4 lakh by flagging an overpriced listing and suggesting a better project.", name: "Rajesh K.", role: "Buyer, Mohali", icon: "💰" },
  { quote: "The builder comparison helped me avoid a delayed project. Trust score was spot on.", name: "Priya S.", role: "First-time buyer", icon: "🛡️" },
  { quote: "Found a 6.2% rental yield property I would never have discovered on listing sites.", name: "Amit V.", role: "Investor", icon: "📈" },
  { quote: "Negotiation tips from AI helped me close 5% below asking price.", name: "Neha M.", role: "Buyer, Zirakpur", icon: "🤝" },
];

export const NEWS_INTELLIGENCE = [
  { title: "GMADA announces new residential sectors", category: "Government", time: "Today", href: "/ask?q=GMADA+new+sectors+announcement" },
  { title: "Mohali prices up 2.3% month-on-month", category: "Price Movement", time: "Today", href: "/ask?q=Mohali+price+trends+2025" },
  { title: "Sushma launches Phase 3 in Sector 117", category: "Builder Launch", time: "Yesterday", href: "/ask?q=Sushma+Sector+117+launch" },
  { title: "RBI holds repo rate — EMI impact analysis", category: "Interest Rates", time: "2 days ago", href: "/ask?q=RBI+rate+impact+home+loans" },
  { title: "PR7 corridor infra update: widening complete", category: "Infrastructure", time: "3 days ago", href: "/ask?q=PR7+corridor+infrastructure+update" },
  { title: "Metro Phase 2 alignment confirmed for Tricity", category: "Infrastructure", time: "This week", href: "/ask?q=Metro+Phase+2+Tricity+alignment" },
];

export const ECOSYSTEM_ROLES = [
  {
    role: "Buyer",
    icon: "🏠",
    desc: "Browse, save, compare, ask AI, and book site visits",
    features: ["Browse", "Save", "Compare", "AI", "Visits"],
    href: "/buyer",
    cta: "Buyer Dashboard",
  },
  {
    role: "Seller",
    icon: "📋",
    desc: "List property, manage inquiries, and track analytics",
    features: ["List property", "Manage inquiries", "Analytics"],
    href: "/seller",
    cta: "Seller Portal",
  },
  {
    role: "Builder",
    icon: "🏗️",
    desc: "Upload inventory, manage projects, and route leads",
    features: ["Inventory", "Projects", "Lead management"],
    href: "/seller",
    cta: "Builder Portal",
  },
  {
    role: "Connect Partner",
    icon: "🤝",
    desc: "Handle assigned properties, CRM, buyers, and site visits",
    features: ["Assigned properties", "CRM", "Buyer handling", "Site visits"],
    href: "/connect",
    cta: "Connect Dashboard",
  },
  {
    role: "Admin",
    icon: "⚙️",
    desc: "Property management, moderation, AI, and analytics",
    features: ["Property management", "Moderation", "AI management", "Analytics"],
    href: "/admin",
    cta: "Admin Console",
  },
];

export const PROPERTY_COMPARE_METRICS = [
  "Builder reputation",
  "Location score",
  "Construction quality",
  "Amenities",
  "Price fairness",
  "Rental yield",
  "ROI projection",
  "Resale potential",
  "Pros & cons",
  "AI verdict",
];

/** @deprecated use SMART_CHIPS */
export const QUICK_CHIPS = SMART_CHIPS;

export const TRICITY_TODAY = [
  {
    area: "Aerocity",
    metric: "+18%",
    metricLabel: "Demand",
    summary: "Airport corridor driving commercial and residential interest",
    gradient: "from-sky-100 to-emerald-50",
    href: "/properties?type=buy&city=Aerocity",
  },
  {
    area: "PR7 Airport Road",
    metric: "↑",
    metricLabel: "Builder activity",
    summary: "New launches increasing along the PR7 corridor",
    gradient: "from-amber-50 to-orange-50",
    href: "/ask?q=PR7+Airport+Road+property+outlook",
  },
  {
    area: "New Chandigarh",
    metric: "Stable",
    metricLabel: "Prices",
    summary: "Master-planned zone holding steady with selective upside",
    gradient: "from-emerald-50 to-teal-50",
    href: "/properties?type=buy&city=New+Chandigarh",
  },
  {
    area: "Sector 82",
    metric: "↑",
    metricLabel: "Rental demand",
    summary: "Strong tenant interest from IT and young professionals",
    gradient: "from-violet-50 to-indigo-50",
    href: "/ask?q=Sector+82+Mohali+rental+demand",
  },
];

/** @deprecated use TRICITY_TODAY */
export const TRENDING_INTELLIGENCE = TRICITY_TODAY;

/** MVP Zero-Level: zeroed — no seeded activity counts */
export const LIVE_ACTIVITY = [
  { label: "New Listings Today", value: 0, href: "/properties?type=buy" },
  { label: "Price Drops", value: 0, href: "/ask?q=Properties+with+price+drops+Tricity" },
  { label: "Builder Offers", value: 0, href: "/ask?q=Current+builder+offers+Tricity" },
  { label: "Site Visits Booked", value: 0, href: "/buyer/site-visits" },
  { label: "Buyer Searches", value: 0, href: "/ask?q=Popular+buyer+searches+Tricity" },
];

export const TRUSTED_BUILDERS = [
  { name: "DLF", initials: "DL", href: "/ask?q=DLF+projects+Tricity" },
  { name: "Hero Homes", initials: "HH", href: "/ask?q=Hero+Homes+Tricity" },
  { name: "Omaxe", initials: "OM", href: "/ask?q=Omaxe+projects+Mohali" },
  { name: "SBP", initials: "SB", href: "/ask?q=SBP+Group+projects+Tricity" },
  { name: "Sushma", initials: "SU", href: "/ask?q=Sushma+builder+Tricity" },
  { name: "GMADA", initials: "GM", href: "/ask?q=GMADA+approved+projects" },
  { name: "Aura", initials: "AU", href: "/ask?q=Aura+developer+Tricity" },
];

export const EXPLORE_AREAS = [
  { name: "Mohali", score: 88, href: "/properties?type=buy&city=Mohali" },
  { name: "Aerocity", score: 92, href: "/properties?type=buy&city=Aerocity" },
  { name: "PR7", score: 90, href: "/ask?q=PR7+Airport+Road+properties" },
  { name: "Zirakpur", score: 85, href: "/properties?type=buy&city=Zirakpur" },
  { name: "New Chandigarh", score: 87, href: "/properties?type=buy&city=New+Chandigarh" },
  { name: "Panchkula", score: 74, href: "/properties?type=buy&city=Panchkula" },
];

/** @deprecated use EXPLORE_AREAS */
export const HEATMAP_AREAS = EXPLORE_AREAS.map((a, i) => ({
  ...a,
  x: [55, 48, 52, 62, 50, 38][i] ?? 50,
  y: [45, 62, 58, 58, 18, 38][i] ?? 50,
}));

export const AREA_COMPARISONS = [
  {
    title: "Mohali vs Aerocity",
    href: "/ask?q=Compare+Mohali+vs+Aerocity+investment",
    metrics: [
      { label: "Rental Yield", a: "4.8%", b: "6.2%" },
      { label: "Price Growth", a: "+12%", b: "+18%" },
      { label: "Schools", a: "High", b: "Medium" },
      { label: "Metro", a: "Planned", b: "Near" },
      { label: "Investment Score", a: "82", b: "88" },
    ],
  },
  {
    title: "Zirakpur vs New Chandigarh",
    href: "/ask?q=Compare+Zirakpur+vs+New+Chandigarh",
    metrics: [
      { label: "Rental Yield", a: "5.1%", b: "3.9%" },
      { label: "Price Growth", a: "+10%", b: "+15%" },
      { label: "Schools", a: "Medium", b: "High" },
      { label: "Metro", a: "Limited", b: "Planned" },
      { label: "Investment Score", a: "79", b: "85" },
    ],
  },
];

export const INVESTMENT_TOOLS: Array<
  | { title: string; desc: string; icon: string; tab: "emi" | "roi" | "rental" | "afford" }
  | { title: string; desc: string; icon: string; href: string }
> = [
  { title: "EMI Calculator", desc: "Estimate monthly payments", icon: "🧮", tab: "emi" },
  { title: "ROI Calculator", desc: "Project your returns", icon: "📊", tab: "roi" },
  { title: "Rental Yield", desc: "Gross yield from rent", icon: "🏠", tab: "rental" },
  { title: "Affordability", desc: "What fits your budget", icon: "💳", tab: "afford" },
  { title: "Investment Score", desc: "AI area scoring", icon: "✦", href: "/ask?q=Best+investment+score+areas+Tricity" },
];

export const INSIGHTS = [
  {
    title: "Why Everyone Is Buying Near PR7",
    category: "Area Intelligence",
    readTime: "5 min",
    excerpt: "Airport Road momentum, infra pipeline, and who should consider this corridor.",
    href: "/ask?q=Why+buy+near+PR7+Airport+Road",
  },
  {
    title: "Should You Wait For Aerocity?",
    category: "Investment",
    readTime: "6 min",
    excerpt: "Timing the market — when waiting helps and when it costs you.",
    href: "/ask?q=Should+I+wait+to+buy+in+Aerocity",
  },
  {
    title: "Top 5 Areas Under ₹80L",
    category: "Buyer's Guide",
    readTime: "4 min",
    excerpt: "AI-ranked micro-markets with the best value under ₹80 lakh today.",
    href: "/ask?q=Top+areas+under+80+lakhs+Tricity",
  },
];

export const RECOMMENDATION_CATEGORIES = [
  { id: "best-value", label: "Best Value", desc: "Lowest price per sq ft", askHref: "/ask?q=Best+value+properties+Tricity" },
  { id: "rental", label: "Highest Rental Yield", desc: "Max rental return", askHref: "/ask?q=Highest+rental+yield+listings+Tricity" },
  { id: "growth", label: "Fastest Appreciation", desc: "Top growth score", askHref: "/ask?q=Fastest+appreciating+areas+Tricity" },
  { id: "luxury", label: "Luxury Pick", desc: "Premium segment", askHref: "/ask?q=Luxury+properties+Tricity" },
  { id: "family", label: "Family Friendly", desc: "3BHK+ in top localities", askHref: "/ask?q=Family+friendly+3BHK+Tricity" },
];

export const POPULAR_SEARCHES = [
  { label: "Flats for sale in Mohali", href: "/properties?type=buy&city=Mohali" },
  { label: "Flats for sale in Chandigarh", href: "/properties?type=buy&city=Chandigarh" },
  { label: "Plots in New Chandigarh", href: "/properties?type=buy&city=New+Chandigarh" },
  { label: "Flats for rent in Mohali", href: "/properties?type=rent&city=Mohali" },
  { label: "SCO for sale in Aerocity", href: "/properties?type=commercial&city=Aerocity" },
  { label: "2BHK in Zirakpur", href: "/properties?type=buy&city=Zirakpur" },
  { label: "Investment in Panchkula", href: "/properties?type=buy&city=Panchkula" },
  { label: "Rental yield areas Tricity", href: "/ask?q=Best+rental+yield+areas+in+Tricity+2025" },
];

export const HOME_NAV_LINKS = [
  { label: "Explore", href: "/properties?type=buy" },
  { label: "AreaIQ Intelligence", href: "/ask" },
  { label: "Properties", href: "/properties" },
  { label: "Insights", href: "/ask?q=Latest+Tricity+market+insights" },
  { label: "Connect", href: "/connect" },
];
