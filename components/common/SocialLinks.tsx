import { BRAND } from "@/lib/brand";

type SocialLinksVariant = "light" | "dark" | "drawer";
type SocialBrand = "areaiq" | "tech172";

interface SocialLinksProps {
  /** Which brand’s profiles to show. */
  brand?: SocialBrand;
  /** Visual surface: light footer, dark footer, or mobile drawer. */
  variant?: SocialLinksVariant;
  /** Show the section label above the icons. */
  showLabel?: boolean;
  /** Override the default section label. */
  label?: string;
  /** Icon glyph size in px (hit target stays 44×44). */
  iconSize?: number;
  className?: string;
}

/**
 * Lucide no longer ships brand icons — these match Lucide’s 24px / stroke-2
 * conventions so sizing and color transitions stay consistent with the set.
 */
function FacebookIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function InstagramIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

const BRAND_LINKS: Record<
  SocialBrand,
  {
    defaultLabel: string;
    ariaLabel: string;
    links: readonly {
      id: string;
      label: string;
      href: string;
      Icon: typeof FacebookIcon;
    }[];
  }
> = {
  areaiq: {
    defaultLabel: "Follow AreaIQ",
    ariaLabel: "AreaIQ social media",
    links: [
      {
        id: "facebook",
        label: "AreaIQ on Facebook",
        href: BRAND.social.areaiq.facebook,
        Icon: FacebookIcon,
      },
      {
        id: "instagram",
        label: "AreaIQ on Instagram",
        href: BRAND.social.areaiq.instagram,
        Icon: InstagramIcon,
      },
    ],
  },
  tech172: {
    defaultLabel: BRAND.poweredBy,
    ariaLabel: "Tech172 social media",
    links: [
      {
        id: "facebook",
        label: "Tech172 on Facebook",
        href: BRAND.social.tech172.facebook,
        Icon: FacebookIcon,
      },
      {
        id: "instagram",
        label: "Tech172 on Instagram",
        href: BRAND.social.tech172.instagram,
        Icon: InstagramIcon,
      },
    ],
  },
};

const VARIANT: Record<
  SocialLinksVariant,
  { wrap: string; label: string; link: string }
> = {
  light: {
    wrap: "gap-2",
    label: "text-xs font-bold uppercase tracking-[0.16em] text-heading-primary",
    link: "text-muted hover:text-[#4AAA27] hover:scale-110",
  },
  dark: {
    wrap: "gap-2",
    label: "text-xs font-semibold uppercase tracking-[0.14em] text-white/80",
    link: "text-neutral-400 hover:text-[#4AAA27] hover:scale-110",
  },
  drawer: {
    wrap: "gap-1",
    label: "text-xs font-semibold uppercase tracking-[0.14em] text-muted",
    link: "text-body hover:text-[#4AAA27] hover:scale-110",
  },
};

export default function SocialLinks({
  brand = "areaiq",
  variant = "light",
  showLabel = true,
  label,
  iconSize = 22,
  className = "",
}: SocialLinksProps) {
  const styles = VARIANT[variant];
  const config = BRAND_LINKS[brand];
  const heading = label ?? config.defaultLabel;
  const labelClass =
    brand === "tech172"
      ? variant === "dark"
        ? "text-sm font-medium text-white/85"
        : "text-sm font-semibold text-heading-primary"
      : styles.label;

  return (
    <div className={className}>
      {showLabel ? <p className={labelClass}>{heading}</p> : null}
      <ul
        className={`flex items-center ${styles.wrap} ${showLabel ? "mt-3" : ""}`}
        aria-label={config.ariaLabel}
      >
        {config.links.map(({ id, label: aria, href, Icon }) => (
          <li key={id}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={aria}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${styles.link}`}
            >
              <Icon size={iconSize} />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
