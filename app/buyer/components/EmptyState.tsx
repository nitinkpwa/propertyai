import Link from "next/link";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel = "Browse Properties",
  actionHref = "/properties",
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-12 text-center shadow-sm">
      <div className="text-4xl">{icon}</div>
      <h3 className="mt-4 text-lg font-semibold text-neutral-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">{description}</p>
      <Link
        href={actionHref}
        className="mt-6 inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(34,197,94,0.35)] transition-all hover:brightness-105"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
