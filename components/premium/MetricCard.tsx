"use client";

interface MetricCardProps {
  icon: string;
  label: string;
  value: number | string;
  href?: string;
  accent?: "emerald" | "blue" | "amber" | "violet" | "rose";
  onClick?: () => void;
}

const ACCENTS = {
  emerald: "from-emerald-500/10 to-emerald-50 border-emerald-100",
  blue: "from-blue-500/10 to-blue-50 border-blue-100",
  amber: "from-amber-500/10 to-amber-50 border-amber-100",
  violet: "from-violet-500/10 to-violet-50 border-violet-100",
  rose: "from-rose-500/10 to-rose-50 border-rose-100",
};

export default function MetricCard({
  icon,
  label,
  value,
  href,
  accent = "emerald",
  onClick,
}: MetricCardProps) {
  const inner = (
    <>
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-sm ring-1 ring-black/5">
        {icon}
      </div>
      <p className="text-3xl font-bold tracking-tight text-heading-primary">{value}</p>
      <p className="mt-1 text-sm font-medium text-body">{label}</p>
    </>
  );

  const className = `group min-w-[140px] shrink-0 snap-start rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition-all active:scale-[0.99] sm:min-w-0 sm:p-5 lg:hover:-translate-y-0.5 lg:hover:shadow-md ${ACCENTS[accent]}`;

  if (href) {
    return (
      <a href={href} className={className}>
        {inner}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`${className} w-full text-left`}>
      {inner}
    </button>
  );
}
