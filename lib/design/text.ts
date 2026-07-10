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

/** Composite classes for common patterns */
export const textInputClass = `${text.input} ${text.placeholder}`;
export const textLabelClass = text.label;
export const textBodyClass = text.body;
export const textMutedClass = text.muted;
