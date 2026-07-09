import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  tips?: string[];
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel = "Browse Properties",
  actionHref = "/properties",
  tips,
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-200 bg-gradient-to-b from-white to-neutral-50/50 px-6 py-12 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl ring-1 ring-emerald-100">
        {icon}
      </div>
      <h3 className="mt-5 text-lg font-semibold text-neutral-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-500">{description}</p>

      {tips && tips.length > 0 ? (
        <ul className="mx-auto mt-5 max-w-sm space-y-2 text-left">
          {tips.map((tip) => (
            <li key={tip} className="flex items-start gap-2 text-xs text-neutral-600">
              <span className="mt-0.5 text-emerald-500" aria-hidden>✓</span>
              {tip}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <ButtonLink href={actionHref}>{actionLabel}</ButtonLink>
        <Link
          href="/ask"
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
        >
          <span aria-hidden>🤖</span> Ask AI for help
        </Link>
      </div>
    </div>
  );
}
