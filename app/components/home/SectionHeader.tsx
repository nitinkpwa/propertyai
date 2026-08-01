import Link from "next/link";

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  variant?: "light" | "dark";
}

export default function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  variant = "light",
}: SectionHeaderProps) {
  const isDark = variant === "dark";
  return (
    <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p
          className={`mb-2 text-xs font-bold uppercase tracking-[0.14em] ${
            isDark ? "text-shadow-brand text-emerald-400" : "text-[#4AAA27]"
          }`}
        >
          {eyebrow}
        </p>
        <h2
          className={`text-2xl font-bold tracking-tight sm:text-3xl ${
            isDark ? "text-shadow-premium text-white" : "text-heading-primary"
          }`}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={`mt-1.5 max-w-xl text-xs leading-snug sm:text-sm ${
              isDark ? "text-white/55" : "text-muted"
            }`}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className={`group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold no-underline transition-colors ${
            isDark
              ? "text-emerald-400 hover:text-emerald-300"
              : "text-[#4AAA27] hover:text-emerald-600"
          }`}
        >
          {action.label}
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      ) : null}
    </div>
  );
}
