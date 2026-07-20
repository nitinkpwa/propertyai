import { EMERALD } from "@/lib/auth/constants";

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
}

export default function AuthButton({
  loading = false,
  loadingText = "Please wait...",
  children,
  disabled,
  className = "",
  ...props
}: AuthButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex min-h-12 w-full items-center justify-center rounded-xl px-5 text-base font-semibold text-white shadow-[0_2px_8px_var(--brand-shadow)] transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400 disabled:shadow-none lg:hover:brightness-105 ${className}`}
      style={disabled || loading ? undefined : { backgroundColor: EMERALD }}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex gap-1" aria-hidden>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
          </span>
          {loadingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
