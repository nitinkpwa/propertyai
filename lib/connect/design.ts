import { text } from "@/lib/design/text";
import { layout, typography, ui } from "@/lib/design/tokens";
import { formatBudgetRange, formatInrAmount } from "@/lib/properties/pricingDisplay";

/** Design tokens for Connect Partner Portal — aligned with layout engine */
export const connectTokens = {
  page: `mx-auto max-w-7xl space-y-6 overflow-x-clip ${layout.pagePad}`,
  card: ui.card,
  cardHover: "hover:shadow-md hover:-translate-y-0.5",
  heading: typography.heading,
  subheading: typography.caption,
  label: `type-micro font-semibold uppercase tracking-wider ${text.label}`,
  hero: "relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-6 text-white shadow-xl sm:p-8",
  btnPrimary: `${ui.btnBase} ${ui.btnPrimary}`,
  btnSecondary: `${ui.btnBase} ${ui.btnSecondary}`,
} as const;

export const PIPELINE_STAGES = [
  { id: "new", label: "New", color: "bg-blue-50 text-blue-700 ring-blue-200" },
  { id: "interested", label: "Contacted", color: "bg-violet-50 text-violet-700 ring-violet-200" },
  { id: "ai_qualified", label: "Qualified", color: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  { id: "visit_scheduled", label: "Visit Scheduled", color: "bg-amber-50 text-amber-700 ring-amber-200" },
  { id: "visited", label: "Visit Completed", color: "bg-teal-50 text-teal-700 ring-teal-200" },
  { id: "negotiation", label: "Negotiation", color: "bg-orange-50 text-orange-700 ring-orange-200" },
  { id: "booked", label: "Token", color: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  { id: "completed", label: "Closed Won", color: "bg-green-50 text-green-700 ring-green-200" },
  { id: "lost", label: "Closed Lost", color: "bg-rose-50 text-rose-700 ring-rose-200" },
] as const;

export function formatBudget(min: number | null, max: number | null): string {
  if (!min && !max) return "—";
  return formatBudgetRange(min, max) || "—";
}

export function formatPrice(price: number): string {
  if (!price || price <= 0) return "Price on Request";
  if (price < 100_000) return "Price on Request";
  return formatInrAmount(price);
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
