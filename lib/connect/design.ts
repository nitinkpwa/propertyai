import { text } from "@/lib/design/text";

/** Design tokens for Connect Partner Portal */
export const connectTokens = {
  page: "mx-auto max-w-7xl space-y-6",
  card: "rounded-2xl border border-neutral-200/80 bg-white shadow-sm transition-all duration-200",
  cardHover: "hover:shadow-md hover:-translate-y-0.5",
  heading: `text-2xl font-bold tracking-tight ${text.headingPrimary}`,
  subheading: `text-sm ${text.muted}`,
  label: `text-xs font-semibold uppercase tracking-wider ${text.label}`,
  hero: "relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-6 text-white shadow-xl sm:p-8",
  btnPrimary:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60",
  btnSecondary:
    `inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold ${text.body} transition-all hover:bg-neutral-50 active:scale-[0.98] disabled:opacity-60`,
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
  const fmt = (n: number) =>
    n >= 10_000_000 ? `₹${(n / 10_000_000).toFixed(1)} Cr` : `₹${(n / 100_000).toFixed(0)} L`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (max) return `Up to ${fmt(max)}`;
  return fmt(min!);
}

export function formatPrice(price: number): string {
  if (!price || price <= 0) return "Price on Request";
  if (price < 100_000) return "Price on Request";
  if (price >= 10_000_000) {
    const cr = price / 10_000_000;
    const label = cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2).replace(/\.?0+$/, "");
    return `₹${label} Cr`;
  }
  const lakhs = price / 100_000;
  const label = lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1).replace(/\.0$/, "");
  return `₹${label} L`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
