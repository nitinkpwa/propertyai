export const EMERALD = "#22C55E";

export const CONNECT_FEATURES = [
  {
    icon: "🏗️",
    title: "Project Management",
    description: "Organize launches, phases, and timelines across your portfolio.",
  },
  {
    icon: "📦",
    title: "Inventory Management",
    description: "Track unit availability, pricing, and status in real time.",
  },
  {
    icon: "📩",
    title: "Lead Management",
    description: "Receive and qualify buyer inquiries from AreaIQ.",
  },
  {
    icon: "🤝",
    title: "Channel Partners",
    description: "Onboard brokers and sales teams with shared visibility.",
  },
  {
    icon: "📈",
    title: "Sales Analytics",
    description: "Monitor funnel performance and conversion metrics.",
  },
  {
    icon: "📄",
    title: "Document Management",
    description: "Store brochures, approvals, and compliance files securely.",
  },
  {
    icon: "📅",
    title: "Site Visit Tracking",
    description: "Schedule, confirm, and follow up on buyer site visits.",
  },
] as const;

export const CONNECT_WHY = [
  "Receive verified buyer leads",
  "Manage multiple projects",
  "Real-time inventory updates",
  "Connect with thousands of channel partners",
  "AI powered buyer matching",
  "Analytics Dashboard",
] as const;

export const CONNECT_STEPS = [
  { step: 1, title: "Register", description: "Create your builder account on AreaIQ Connect." },
  { step: 2, title: "Verify Builder", description: "Submit company and RERA details for verification." },
  { step: 3, title: "Upload Projects", description: "Add projects, towers, and inventory units." },
  { step: 4, title: "Receive Buyer Leads", description: "Get matched with qualified AreaIQ buyers." },
  { step: 5, title: "Manage Sales", description: "Track visits, partners, and conversions." },
] as const;

export const CONNECT_TESTIMONIALS = [
  {
    quote: "AreaIQ Connect helped us centralize leads from multiple channel partners in one place.",
    name: "Builder Partner",
    role: "Residential Developer, Mohali",
  },
  {
    quote: "The inventory view gives our sales team clarity on what's available to sell today.",
    name: "Sales Director",
    role: "Tricity Developer",
  },
  {
    quote: "Verified buyer leads reduced our follow-up time and improved conversion rates.",
    name: "Project Head",
    role: "Commercial Developer",
  },
] as const;

export const CONNECT_PRICING = [
  {
    name: "Starter",
    description: "For emerging builders launching their first projects.",
    price: "Coming Soon",
    featured: false,
  },
  {
    name: "Professional",
    description: "For growing developers managing multiple launches.",
    price: "Coming Soon",
    featured: true,
  },
  {
    name: "Enterprise",
    description: "For large portfolios with channel partner networks.",
    price: "Coming Soon",
    featured: false,
  },
] as const;

export const CONNECT_FAQ = [
  {
    q: "Who can register on AreaIQ Connect?",
    a: "Registered builders, developers, and real estate companies with valid business credentials can create an account.",
  },
  {
    q: "How do I receive buyer leads?",
    a: "Once your projects are listed, AreaIQ matches verified buyers to your inventory and routes inquiries to your dashboard.",
  },
  {
    q: "Is RERA verification required?",
    a: "RERA details are optional at registration but recommended for faster verification and buyer trust.",
  },
  {
    q: "Can channel partners access my inventory?",
    a: "You control partner access. Approved channel partners can view assigned project inventory and leads.",
  },
  {
    q: "When will pricing be available?",
    a: "Starter, Professional, and Enterprise plans are coming soon. Book a demo to discuss early access.",
  },
] as const;

export const CONNECT_CITIES = [
  "Chandigarh",
  "Mohali",
  "Panchkula",
  "Zirakpur",
  "Kharar",
  "New Chandigarh",
  "Aerocity",
] as const;
