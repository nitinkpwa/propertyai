import { EMERALD } from "@/lib/auth/constants";

interface AuthButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
      className={`inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(34,197,94,0.35)] transition-all duration-200 hover:shadow-[0_4px_14px_rgba(34,197,94,0.45)] hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
      style={{ backgroundColor: EMERALD }}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          {loadingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
