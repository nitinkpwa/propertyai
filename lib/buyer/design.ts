import { text } from "@/lib/design/text";

/** Shared design tokens for the Buyer Portal */
export const buyerTokens = {
  radius: {
    sm: "rounded-xl",
    md: "rounded-2xl",
    lg: "rounded-3xl",
    full: "rounded-full",
  },
  card: "rounded-2xl border border-neutral-200/80 bg-white shadow-sm transition-all duration-200",
  cardHover: "hover:shadow-md hover:-translate-y-0.5",
  section: "space-y-4",
  page: "mx-auto max-w-6xl space-y-8",
  heading: `text-2xl font-bold tracking-tight ${text.headingPrimary} sm:text-3xl`,
  subheading: `text-sm ${text.muted}`,
  label: `text-xs font-semibold uppercase tracking-wider ${text.label}`,
  gradientHero:
    "relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-xl shadow-emerald-900/20",
  btnPrimary:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(34,197,94,0.35)] transition-all hover:bg-emerald-700 hover:brightness-105 active:scale-[0.98] disabled:opacity-60",
  btnSecondary:
    `inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold ${text.body} transition-all hover:bg-neutral-50 active:scale-[0.98] disabled:opacity-60`,
  btnGhost:
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-50 active:scale-[0.98]",
  input:
    `w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm ${text.input} ${text.placeholder} outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10`,
} as const;

export const COLLECTION_PRESETS = [
  { id: "all", label: "All Saved", icon: "❤️" },
  { id: "investment", label: "Investment", icon: "📈" },
  { id: "luxury", label: "Luxury", icon: "✨" },
  { id: "family", label: "Family", icon: "🏡" },
  { id: "commercial", label: "Commercial", icon: "🏢" },
  { id: "favorites", label: "Favorites", icon: "⭐" },
] as const;

export type CollectionId = (typeof COLLECTION_PRESETS)[number]["id"];

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
