import Image from "next/image";
import Link from "next/link";
import { EMERALD } from "@/lib/auth/constants";

export const LOGO_SRC = "/logo.png";
export const LOGO_TAGLINE = "AI-Powered Real Estate Intelligence";

const ICON_SIZES = {
  navbar: 42,
  hero: 70,
  footer: 36,
  dashboard: 42,
} as const;

export type LogoSize = keyof typeof ICON_SIZES;

const WORD_CLASSES: Record<LogoSize, string> = {
  navbar: "text-lg",
  hero: "text-2xl sm:text-[1.75rem]",
  footer: "text-base",
  dashboard: "text-base",
};

const TAGLINE_CLASSES: Record<LogoSize, string> = {
  navbar: "text-xs",
  hero: "text-xs sm:text-sm",
  footer: "text-xs",
  dashboard: "text-xs",
};

export type LogoProps = {
  size?: LogoSize;
  href?: string | null;
  showTagline?: boolean;
  showWordmark?: boolean;
  suffix?: string;
  variant?: "default" | "light" | "dark";
  iconOnly?: boolean;
  className?: string;
  priority?: boolean;
  accentColor?: string;
  lightAccentColor?: string;
};

export default function Logo({
  size = "navbar",
  href = "/",
  showTagline = false,
  showWordmark = true,
  suffix,
  variant = "default",
  iconOnly = false,
  className = "",
  priority = false,
  accentColor = EMERALD,
  lightAccentColor = "#4ADE80",
}: LogoProps) {
  const iconPx = ICON_SIZES[size];
  const isLight = variant === "light";
  const isDark = variant === "dark";
  const iqColor = isLight ? lightAccentColor : isDark ? "#4ADE80" : accentColor;

  const image = (
    <Image
      src={LOGO_SRC}
      alt={iconOnly ? "AreaIQ" : ""}
      width={iconPx}
      height={iconPx}
      priority={priority || size === "hero" || size === "navbar"}
      className="shrink-0 object-contain"
      aria-hidden={!iconOnly && showWordmark ? true : undefined}
    />
  );

  const content = iconOnly ? (
    image
  ) : (
    <>
      {image}
      {showWordmark ? (
        <div className="flex min-w-0 flex-col">
          <span
            className={`font-semibold tracking-tight ${WORD_CLASSES[size]} ${
              isLight || isDark ? "text-white" : "text-heading-primary"
            }`}
            style={isLight ? { textShadow: "0 2px 10px rgba(0,0,0,0.3)" } : undefined}
          >
            Area<span style={{ color: iqColor }}>IQ</span>
            {suffix ? (
              <span className={isLight || isDark ? "text-white/90" : "text-heading-secondary"}>
                {" "}
                {suffix}
              </span>
            ) : null}
          </span>
          {showTagline ? (
            <span
              className={`font-medium leading-snug ${TAGLINE_CLASSES[size]} ${
                isLight
                  ? "text-white/75"
                  : "text-muted"
              } ${size === "navbar" ? "hidden sm:block" : ""}`}
              style={isLight ? { textShadow: "0 1px 8px rgba(0,0,0,0.25)" } : undefined}
            >
              {LOGO_TAGLINE}
            </span>
          ) : null}
        </div>
      ) : null}
    </>
  );

  const rootClass = `group inline-flex shrink-0 items-center gap-3 no-underline ${className}`;

  if (href) {
    return (
      <Link href={href} className={rootClass}>
        {content}
      </Link>
    );
  }

  return <div className={rootClass.replace("no-underline", "")}>{content}</div>;
}
