import { text } from "@/lib/design/text";
import { layout, typography, ui } from "@/lib/design/tokens";

/** Shared design tokens for the Buyer Portal — aligned with layout engine */
export const buyerTokens = {
  radius: {
    sm: "rounded-xl",
    md: "rounded-2xl",
    lg: "rounded-3xl",
    full: "rounded-full",
  },
  card: ui.card,
  cardHover: "hover:shadow-md hover:-translate-y-0.5",
  section: "space-y-4",
  page: `mx-auto max-w-6xl space-y-8 overflow-x-clip ${layout.pagePad}`,
  heading: typography.heading,
  subheading: typography.caption,
  label: `type-micro font-semibold uppercase tracking-wider ${text.label}`,
  gradientHero:
    "relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-xl shadow-emerald-900/20",
  btnPrimary: `${ui.btnBase} ${ui.btnPrimary}`,
  btnSecondary: `${ui.btnBase} ${ui.btnSecondary}`,
  btnGhost: `${ui.btnBase} ${ui.btnGhost}`,
  input: ui.input,
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
