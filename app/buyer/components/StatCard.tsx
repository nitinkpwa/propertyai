interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  href?: string;
}

export default function StatCard({ label, value, icon, href }: StatCardProps) {
  const content = (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-neutral-900">{value}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-lg">
          {icon}
        </span>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block no-underline">
        {content}
      </a>
    );
  }

  return content;
}
