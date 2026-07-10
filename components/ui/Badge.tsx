type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "neutral";

const VARIANTS: Record<BadgeVariant, string> = {
  default: "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
  warning: "bg-amber-50 text-amber-700 ring-amber-200/80",
  error: "bg-rose-50 text-rose-700 ring-rose-200/80",
  info: "bg-blue-50 text-blue-700 ring-blue-200/80",
  neutral: "bg-neutral-100 text-body ring-neutral-200/80",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export default function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
