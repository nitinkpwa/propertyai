/** WCAG AA semantic text color tokens for light backgrounds */
export const text = {
  headingPrimary: "text-heading-primary",
  headingSecondary: "text-heading-secondary",
  body: "text-body",
  muted: "text-muted",
  label: "text-label",
  input: "text-input",
  placeholder: "placeholder:text-placeholder",
} as const;

/**
 * Premium typography lighting — soft white lift + tiny ambient.
 * Prefer these over heavy black/dark text-shadow or drop-shadow.
 */
export const TEXT_SHADOW_PREMIUM =
  "0 1px 2px rgba(255,255,255,0.35), 0 8px 12px rgba(0,0,0,0.12)";

/** White / light text over photography or dark gradients */
export const TEXT_SHADOW_ON_PHOTO =
  "0 1px 2px rgba(255,255,255,0.25), 0 4px 10px rgba(0,0,0,0.12)";

/** Brand green (#4AAA27) — illuminated, never black-outlined */
export const TEXT_SHADOW_BRAND = "0 0 10px rgba(255,255,255,0.18)";

/** Tailwind utility class names (defined in globals.css) */
export const textShadow = {
  premium: "text-shadow-premium",
  photo: "text-shadow-photo",
  brand: "text-shadow-brand",
} as const;

/** Composite classes for common patterns */
export const textInputClass = `${text.input} ${text.placeholder}`;
export const textLabelClass = text.label;
export const textBodyClass = text.body;
export const textMutedClass = text.muted;
