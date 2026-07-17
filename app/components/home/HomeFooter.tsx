import Link from "next/link";
import Logo from "@/components/common/Logo";
import { BRAND } from "@/lib/brand";

export default function HomeFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200 bg-[#F7F9FB]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
          {/* Left — Brand */}
          <div className="max-w-sm">
            <Logo size="footer" href="/" />
            <p className="mt-3 text-sm font-medium text-emerald-700">{BRAND.poweredBy}</p>
            <p className="mt-4 text-sm leading-relaxed text-muted">{BRAND.tagline}</p>
          </div>

          {/* Middle — Products */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-heading-primary">
              Products
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

          {/* Right — Contact */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-heading-primary">
              Contact
            </p>
            <div className="mt-4 space-y-3 text-sm text-muted">
              <p className="font-semibold text-heading-primary">{BRAND.company}</p>
              <address className="not-italic leading-relaxed">
                {BRAND.contact.addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
              <div className="space-y-1">
                {BRAND.contact.phones.map((phone) => (
                  <a
                    key={phone}
                    href={`tel:${phone.replace(/\s/g, "")}`}
                    className="block text-muted no-underline transition-colors hover:text-heading-primary"
                  >
                    {phone}
                  </a>
                ))}
              </div>
              <a
                href={`mailto:${BRAND.contact.email}`}
                className="block text-muted no-underline transition-colors hover:text-heading-primary"
              >
                {BRAND.contact.email}
              </a>
              <a
                href={BRAND.contact.website}
                target="_blank"
                rel="noopener noreferrer"
                className="block font-medium text-emerald-700 no-underline transition-colors hover:text-emerald-800"
              >
                {BRAND.contact.websiteLabel}
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-neutral-200 pt-8">
          <p className="text-center text-xs leading-relaxed text-muted">
            {BRAND.copyright(year)}
          </p>
        </div>
      </div>
    </footer>
  );
}
