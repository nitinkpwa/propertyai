import Image from "next/image";
import Link from "next/link";
import { ui } from "@/lib/design/tokens";
import Badge from "@/components/ui/Badge";

interface BuilderCardProps {
  name: string;
  logoUrl?: string | null;
  projectsCount?: number;
  verified?: boolean;
  href?: string;
  onContact?: () => void;
  className?: string;
}

export default function BuilderCard({
  name,
  logoUrl,
  projectsCount,
  verified,
  href,
  onContact,
  className = "",
}: BuilderCardProps) {
  const content = (
    <div className={`${ui.card} ${ui.cardPress} flex items-center gap-4 p-4 ${className}`}>
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-neutral-100">
        {logoUrl ? (
          <Image src={logoUrl} alt="" fill sizes="56px" className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-lg font-bold text-brand">
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-semibold text-heading-primary">{name}</h3>
          {verified ? <Badge variant="success">Verified</Badge> : null}
        </div>
        {projectsCount !== undefined ? (
          <p className="mt-0.5 text-sm text-muted">{projectsCount} projects</p>
        ) : null}
      </div>
      {onContact ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onContact();
          }}
          className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-neutral-200 px-3 text-sm font-semibold text-body"
        >
          Contact
        </button>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}
