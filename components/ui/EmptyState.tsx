import { Button, ButtonLink } from "@/components/ui/Button";

interface EmptyStateProps {
  title: string;
  description?: string;
  illustration?: React.ReactNode;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  className?: string;
}

function DefaultIllustration() {
  return (
    <svg
      width="120"
      height="96"
      viewBox="0 0 120 96"
      fill="none"
      aria-hidden
      className="text-brand"
    >
      <rect x="20" y="28" width="80" height="52" rx="12" className="fill-brand-muted stroke-brand-border" strokeWidth="1.5" />
      <path
        d="M36 52h48M36 62h28"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
      <circle cx="60" cy="24" r="14" className="fill-white stroke-brand" strokeWidth="2" />
      <path d="M60 18v12M54 24h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function EmptyState({
  title,
  description,
  illustration,
  actionLabel,
  actionHref,
  onAction,
  secondaryLabel,
  onSecondary,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-6 py-12 text-center animate-page-enter ${className}`}
    >
      <div className="mb-5">{illustration ?? <DefaultIllustration />}</div>
      <h3 className="text-xl font-semibold text-heading-primary">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-base text-muted">{description}</p>
      ) : null}
      {(actionLabel || secondaryLabel) && (
        <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
          {actionLabel && actionHref ? (
            <ButtonLink href={actionHref} fullWidth>
              {actionLabel}
            </ButtonLink>
          ) : actionLabel && onAction ? (
            <Button type="button" onClick={onAction} fullWidth>
              {actionLabel}
            </Button>
          ) : null}
          {secondaryLabel && onSecondary ? (
            <Button type="button" variant="secondary" onClick={onSecondary} fullWidth>
              {secondaryLabel}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
