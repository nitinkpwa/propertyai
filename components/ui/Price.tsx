interface PriceProps {
  value: string | number;
  /** Smaller caption under price e.g. "onwards" */
  suffix?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  sm: "text-base font-semibold",
  md: "text-xl font-bold",
  lg: "text-2xl font-bold",
  xl: "text-[28px] font-bold tracking-tight",
} as const;

export default function Price({ value, suffix, size = "lg", className = "" }: PriceProps) {
  const display = typeof value === "number" ? formatInr(value) : value;

  return (
    <div className={`leading-none ${className}`}>
      <span className={`${SIZES[size]} text-heading-primary`}>{display}</span>
      {suffix ? <span className="ml-1.5 text-sm font-medium text-muted">{suffix}</span> : null}
    </div>
  );
}

function formatInr(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}
