import { Button } from "@/components/ui/Button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

function ErrorIllustration() {
  return (
    <svg width="120" height="96" viewBox="0 0 120 96" fill="none" aria-hidden>
      <circle cx="60" cy="44" r="28" className="fill-rose-50 stroke-rose-200" strokeWidth="1.5" />
      <path
        d="M60 32v16M60 56h.01"
        stroke="#e11d48"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ErrorState({
  title = "Something went wrong",
  description = "We couldn’t load this right now. Please try again.",
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-6 py-12 text-center animate-page-enter ${className}`}
      role="alert"
    >
      <div className="mb-5">
        <ErrorIllustration />
      </div>
      <h3 className="text-xl font-semibold text-heading-primary">{title}</h3>
      <p className="mt-2 max-w-sm text-base text-muted">{description}</p>
      {onRetry ? (
        <div className="mt-6 w-full max-w-xs">
          <Button type="button" onClick={onRetry} fullWidth>
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}
