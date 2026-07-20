/** AreaIQ mobile-first design tokens — 8px grid, type scale, motion. */

export const breakpoints = {
  xs: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1440,
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const typeScale = {
  h1: 32,
  h2: 28,
  h3: 24,
  h4: 20,
  body: 16,
  caption: 14,
  small: 12,
} as const;

export const touch = {
  min: 44,
  button: 48,
  input: 52,
  topBar: 64,
  bottomNav: 64,
} as const;

export const motion = {
  pageMs: 200,
  press: "active:scale-[0.98]",
  hoverLg: "lg:hover:shadow-md lg:hover:-translate-y-0.5",
} as const;

export const layout = {
  pagePad: "px-4 sm:px-5 md:px-6",
  sectionGap: "space-y-6",
  cardPad: "p-4",
} as const;

/** Shared class strings for mobile-first UI */
export const ui = {
  btnBase:
    "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400 disabled:shadow-none lg:w-auto",
  btnPrimary:
    "bg-brand text-white shadow-[0_2px_8px_var(--brand-shadow)] hover:bg-brand-hover",
  btnSecondary:
    "border border-neutral-200 bg-white text-body hover:bg-neutral-50",
  btnDanger:
    "border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100",
  btnGhost: "bg-transparent text-brand-dark hover:bg-brand-muted",
  btnDisabled: "bg-neutral-200 text-neutral-400",
  input:
    "peer h-[52px] w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 pt-4 text-base text-input outline-none transition-all placeholder:text-transparent focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10",
  labelFloat:
    "pointer-events-none absolute left-4 top-1/2 origin-left -translate-y-1/2 text-base text-placeholder transition-all peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:font-medium peer-focus:text-brand peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:text-label",
  card: "rounded-2xl border border-neutral-200/80 bg-white shadow-sm transition-all duration-200",
  cardPress: "active:scale-[0.99] lg:active:scale-100",
  sheet:
    "fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-hidden rounded-t-3xl bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.12)]",
  safeBottom: "pb-[max(1rem,env(safe-area-inset-bottom))]",
  safeTop: "pt-[env(safe-area-inset-top)]",
  topBar: "h-16",
  bottomNav: "h-16",
  typeH1: "text-[32px] font-bold leading-tight tracking-tight text-heading-primary",
  typeH2: "text-[28px] font-bold leading-tight tracking-tight text-heading-primary",
  typeH3: "text-2xl font-bold leading-snug text-heading-primary",
  typeH4: "text-xl font-semibold leading-snug text-heading-primary",
  typeBody: "text-base leading-relaxed text-body",
  typeCaption: "text-sm leading-normal text-muted",
  typeSmall: "text-xs leading-normal text-muted",
} as const;
