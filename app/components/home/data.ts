export const MARKET_TICKER_ITEMS = [
  { icon: "📈", text: "Mohali prices +2.3%", href: "/ask?q=Mohali+price+trends+2025" },
  { icon: "🏗", text: "3 New Launches Today", href: "/ask?q=New+launch+projects+Tricity+today" },
  { icon: "🔥", text: "Aerocity Rental Yield 6.8%", href: "/ask?q=Aerocity+rental+yield" },
  { icon: "👥", text: "12 Buyers searched Zirakpur today", href: "/properties?type=buy&city=Zirakpur" },
  { icon: "🎁", text: "Builder Offer ending in 2 days", href: "/ask?q=Current+builder+offers+Tricity" },
];

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
  "3 BHK under ₹90L near Airport",
  "Compare Aerocity vs IT City",
  "Best investment in Mohali",
  "Should I buy now or wait?",
];

export const SMART_CHIPS = [
  { label: "Under ₹60L", href: "/properties?type=buy&max=6000000", icon: "💰" },
  { label: "High ROI", href: "/ask?q=Best+high+ROI+investment+Tricity", icon: "📈" },
  { label: "New Launches", href: "/ask?q=New+launch+projects+Tricity", icon: "🚀" },
  { label: "Rental Yield", href: "/ask?q=Highest+rental+yield+areas+Tricity", icon: "🏠" },
  { label: "Family Homes", href: "/properties?type=buy&city=Mohali", icon: "👨‍👩‍👧" },
  { label: "Near Airport", href: "/properties?type=buy&city=Aerocity", icon: "✈️" },
  { label: "Near Metro", href: "/ask?q=Properties+near+metro+Tricity", icon: "🚇" },
  { label: "Commercial", href: "/properties?type=commercial", icon: "🏢" },
  { label: "Luxury", href: "/properties?type=buy&min=20000000", icon: "✨" },
  { label: "Gated Society", href: "/ask?q=Gated+society+projects+Tricity", icon: "🏘️" },
  { label: "Schools Nearby", href: "/ask?q=Areas+with+best+schools+Tricity", icon: "🎓" },
  { label: "Hospitals Nearby", href: "/ask?q=Areas+with+good+hospitals+Tricity", icon: "🏥" },
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

export const LIVE_ACTIVITY = [
  { label: "New Listings Today", value: 24, href: "/properties?type=buy" },
  { label: "Price Drops", value: 8, href: "/ask?q=Properties+with+price+drops+Tricity" },
  { label: "Builder Offers", value: 5, href: "/ask?q=Current+builder+offers+Tricity" },
  { label: "Site Visits Booked", value: 17, href: "/buyer/site-visits" },
  { label: "Buyer Searches", value: 142, href: "/ask?q=Popular+buyer+searches+Tricity" },
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
  { label: "AI Assistant", href: "/ask" },
  { label: "Properties", href: "/properties" },
  { label: "Insights", href: "/ask?q=Latest+Tricity+market+insights" },
  { label: "Connect", href: "/connect" },
];
