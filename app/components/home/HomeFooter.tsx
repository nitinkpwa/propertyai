import Link from "next/link";
import Logo from "@/components/common/Logo";
import SocialLinks from "@/components/common/SocialLinks";
import { BRAND } from "@/lib/brand";
import FooterTech172Map from "./FooterTech172Map";

export default function HomeFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200 bg-[#F7F9FB]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2">
          {/* AreaIQ */}
          <div className="max-w-sm">
            <Logo size="footer" href="/" />
            <p className="mt-3 text-sm font-medium text-emerald-700">{BRAND.poweredBy}</p>
            <p className="mt-4 text-sm leading-relaxed text-muted">{BRAND.tagline}</p>
            <SocialLinks brand="areaiq" variant="light" className="mt-6" />
          </div>

          {/* Quick Links */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-heading-primary">
              Quick Links
            </p>
            <ul className="mt-4 space-y-2.5">
              {BRAND.products.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted no-underline transition-colors hover:text-heading-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <FooterTech172Map />

        <div className="mt-12 border-t border-neutral-200 pt-8">
          <p className="text-center text-xs leading-relaxed text-muted">
            {BRAND.copyright(year)}
          </p>
        </div>
      </div>
    </footer>
  );
}
