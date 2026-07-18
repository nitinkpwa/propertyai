import Image from "next/image";
import Link from "next/link";
import { BRAND_LIGHT, BRAND_PRIMARY } from "@/lib/design/colors";
import { TEXT_SHADOW_BRAND, TEXT_SHADOW_ON_PHOTO } from "@/lib/design/text";
import { BRAND } from "@/lib/brand";

export const LOGO_SRC = BRAND.assets.logo;
export const LOGO_TAGLINE = BRAND.poweredBy;
export const LOGO_ALT = BRAND.alt.logo;

/** Display heights — mobile 34–38px, desktop 40–44px. */
const ICON_SIZES = {
  navbar: { mobile: 36, desktop: 42 },
  hero: { mobile: 38, desktop: 44 },
  footer: { mobile: 34, desktop: 36 },
  dashboard: { mobile: 36, desktop: 40 },
} as const;

export type LogoSize = keyof typeof ICON_SIZES;

const WORD_CLASSES: Record<LogoSize, string> = {
  navbar: "text-[15px] sm:text-lg",
  hero: "text-lg sm:text-xl",
  footer: "text-sm sm:text-base",
  dashboard: "text-sm sm:text-base",
};

const TAGLINE_CLASSES: Record<LogoSize, string> = {
  navbar: "text-[10px] sm:text-xs",
  hero: "text-[10px] sm:text-xs",
  footer: "text-[10px] sm:text-xs",
  dashboard: "text-[10px] sm:text-xs",
};

const HEIGHT_CLASSES: Record<LogoSize, string> = {
  navbar: "h-9 w-9 sm:h-[42px] sm:w-[42px]",
  hero: "h-[38px] w-[38px] sm:h-11 sm:w-11",
  footer: "h-[34px] w-[34px] sm:h-9 sm:w-9",
  dashboard: "h-9 w-9 sm:h-10 sm:w-10",
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
  accentColor = BRAND_PRIMARY,
  lightAccentColor = BRAND_LIGHT,
}: LogoProps) {
  const dims = ICON_SIZES[size];
  const isLight = variant === "light";
  const isDark = variant === "dark";
  const iqColor = isLight ? lightAccentColor : isDark ? BRAND_LIGHT : accentColor;

  const imageAlt = iconOnly || !href ? LOGO_ALT : "";

  const image = (
    <Image
      src={LOGO_SRC}
      alt={imageAlt}
      width={dims.desktop}
      height={dims.desktop}
      priority={priority}
      sizes={`${dims.mobile}px`}
      className={`shrink-0 object-contain object-center ${HEIGHT_CLASSES[size]}`}
      aria-hidden={imageAlt ? undefined : true}
    />
  );

  const content = iconOnly ? (
    image
  ) : (
    <>
      <span className="inline-flex shrink-0 items-center justify-center p-0.5">{image}</span>
      {showWordmark ? (
        <div className="flex min-w-0 flex-col justify-center py-0.5">
          <span
            className={`font-semibold leading-none tracking-tight ${WORD_CLASSES[size]} ${
              isLight || isDark ? "text-white" : "text-heading-primary"
            }`}
            style={isLight ? { textShadow: TEXT_SHADOW_ON_PHOTO } : undefined}
          >
            Area
            <span
              style={{
                color: iqColor,
                ...(isLight ? { textShadow: TEXT_SHADOW_BRAND } : null),
              }}
            >
              IQ
            </span>
            {suffix ? (
              <span className={isLight || isDark ? "text-white/90" : "text-heading-secondary"}>
                {" "}
                {suffix}
              </span>
            ) : null}
          </span>
          {showTagline ? (
            <span
              className={`mt-0.5 font-medium leading-snug ${TAGLINE_CLASSES[size]} ${
                isLight ? "text-white/75" : "text-muted"
              } ${size === "navbar" ? "hidden sm:block" : ""}`}
              style={isLight ? { textShadow: TEXT_SHADOW_ON_PHOTO } : undefined}
            >
              {LOGO_TAGLINE}
            </span>
          ) : null}
        </div>
      ) : showTagline ? (
        <span
          className={`font-medium leading-snug ${TAGLINE_CLASSES[size]} ${
            isLight ? "text-white/75" : "text-muted"
          }`}
        >
          {LOGO_TAGLINE}
        </span>
      ) : null}
    </>
  );

  const rootClass = `group inline-flex shrink-0 items-center gap-2.5 no-underline sm:gap-3 ${className}`;

  if (href) {
    return (
      <Link href={href} className={rootClass} aria-label={LOGO_ALT}>
        {content}
      </Link>
    );
  }

  return (
    <div className={rootClass.replace("no-underline", "")} role="img" aria-label={LOGO_ALT}>
      {content}
    </div>
  );
}
