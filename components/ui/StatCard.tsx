import { ui } from "@/lib/design/tokens";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export default function StatCard({
  label,
  value,
  delta,
  deltaPositive,
  icon,
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`${ui.card} ${ui.cardPress} flex min-w-[148px] shrink-0 flex-col gap-2 p-4 snap-start ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-label">{label}</span>
        {icon ? <span className="text-brand">{icon}</span> : null}
      </div>
      <p className="text-2xl font-bold tracking-tight text-heading-primary">{value}</p>
      {delta ? (
        <p
          className={`text-sm font-medium ${
            deltaPositive === false ? "text-rose-600" : "text-brand-dark"
          }`}
        >
          {delta}
        </p>
      ) : null}
    </div>
  );
}

/** Horizontal swipe row of stat cards for mobile analytics */
export function StatCardCarousel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`-mx-4 flex gap-3 overflow-x-auto scroll-touch px-4 pb-1 snap-x snap-mandatory lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 lg:snap-none ${className}`}
    >
      {children}
    </div>
  );
}
