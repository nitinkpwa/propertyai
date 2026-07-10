import type { WizardStepId } from "./types";

export const WIZARD_STEPS: Array<{
  id: WizardStepId;
  title: string;
  subtitle: string;
  icon: string;
}> = [
  { id: "basic", title: "Basic Info", subtitle: "Title, builder, type & status", icon: "🏷️" },
  { id: "location", title: "Location", subtitle: "Address, geo & distances", icon: "📍" },
  { id: "pricing", title: "Pricing", subtitle: "Price breakdown & payment plans", icon: "💰" },
  { id: "specs", title: "Specifications", subtitle: "Layout, areas & quality", icon: "📐" },
  { id: "amenities", title: "Amenities", subtitle: "Select factual amenities", icon: "✨" },
  { id: "media", title: "Media", subtitle: "Photos, video & virtual tours", icon: "🎬" },
  { id: "documents", title: "Documents", subtitle: "Brochures & floor plans", icon: "📄" },
  { id: "seo", title: "SEO", subtitle: "URL slug & canonical (optional)", icon: "🔍" },
  { id: "publishing", title: "Publishing", subtitle: "Workflow & listing flags", icon: "🚀" },
  { id: "connect", title: "Connect Partner", subtitle: "One partner per property", icon: "🤝" },
];

export const AMENITY_CHIPS = [
  "Pool",
  "Gym",
  "Clubhouse",
  "Sports",
  "Kids Area",
  "EV Charging",
  "Security",
  "Smart Home",
  "Co-working",
  "Cafe",
  "Jogging Track",
  "Garden",
  "Pet Friendly",
  "Temple",
  "Medical",
  "Shopping",
  "Cinema",
  "Restaurant",
  "Lift",
  "Power Backup",
  "Parking",
  "Concierge",
  "Spa",
  "Yoga",
  "Indoor Games",
  "Banquet Hall",
  "Amphitheatre",
  "Sky Lounge",
] as const;

export const PROPERTY_STATUS_OPTIONS = [
  { value: "ready", label: "Ready to Move" },
  { value: "under-construction", label: "Under Construction" },
  { value: "new-launch", label: "New Launch" },
  { value: "resale", label: "Resale" },
];

export const PURPOSE_OPTIONS = [
  { value: "end-use", label: "End Use" },
  { value: "investment", label: "Investment" },
  { value: "rental", label: "Rental Income" },
  { value: "nri", label: "NRI Investment" },
];

export const OWNERSHIP_OPTIONS = [
  { value: "freehold", label: "Freehold" },
  { value: "leasehold", label: "Leasehold" },
  { value: "cooperative", label: "Cooperative Society" },
];

export const WORKFLOW_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "review", label: "In Review" },
  { value: "approved", label: "Approved" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

export const FURNISHING_OPTIONS = [
  "Unfurnished",
  "Semi-Furnished",
  "Fully Furnished",
];

export const FACING_OPTIONS = [
  "North",
  "South",
  "East",
  "West",
  "North-East",
  "North-West",
  "South-East",
  "South-West",
];

export const CMS_SECTIONS = [
  { id: "info", label: "Property Facts", icon: "🏠" },
  { id: "location", label: "Location", icon: "📍" },
  { id: "pricing", label: "Pricing", icon: "💰" },
  { id: "specs", label: "Specifications", icon: "📐" },
  { id: "amenities", label: "Amenities", icon: "✨" },
  { id: "media", label: "Media", icon: "🎬" },
  { id: "documents", label: "Documents", icon: "📄" },
  { id: "connect", label: "Connect Partner", icon: "🤝" },
  { id: "publishing", label: "Publishing", icon: "🚀" },
  { id: "ai", label: "AI Intelligence", icon: "🤖" },
] as const;

export const ADMIN_FORM_STYLES = {
  input:
    "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-input placeholder:text-placeholder outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100",
  label: "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-label",
  textarea:
    "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-input placeholder:text-placeholder outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 min-h-[88px] resize-y",
  card: "rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm",
  sectionTitle: "text-lg font-bold tracking-tight text-heading-primary",
  sectionDesc: "mt-1 text-sm text-muted",
} as const;
