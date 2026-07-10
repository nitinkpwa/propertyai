import Link from "next/link";
import Logo from "@/components/common/Logo";

const FOOTER_COLUMNS = [
  {
    title: "Buyer",
    links: [
      { label: "AI Assistant", href: "/ask" },
      { label: "Browse Properties", href: "/properties?type=buy" },
      { label: "Compare", href: "/buyer/compare" },
      { label: "Saved", href: "/buyer/saved" },
      { label: "Site Visits", href: "/buyer/site-visits" },
      { label: "Buyer Dashboard", href: "/buyer" },
    ],
  },
  {
    title: "Seller & Builder",
    links: [
      { label: "List Property", href: "/seller" },
      { label: "Seller Portal", href: "/seller" },
      { label: "Builder Inventory", href: "/seller" },
      { label: "Analytics", href: "/seller" },
    ],
  },
  {
    title: "Connect Partner",
    links: [
      { label: "Connect Home", href: "/connect" },
      { label: "Partner Dashboard", href: "/connect/dashboard" },
      { label: "CRM", href: "/connect/dashboard" },
      { label: "Register", href: "/connect/register" },
    ],
  },
  {
    title: "Intelligence",
    links: [
      { label: "Market Intelligence", href: "/ask?q=Latest+Tricity+market+intelligence" },
      { label: "Area Comparison", href: "/ask?q=Compare+areas+Tricity" },
      { label: "Investment Guide", href: "/ask?q=Best+investment+areas+Tricity" },
      { label: "Loan Calculator", href: "/ask?q=Home+loan+EMI+calculation" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Admin Console", href: "/admin" },
      { label: "Contact", href: "mailto:hello@areaiq.in" },
      { label: "Privacy", href: "/ask?q=AreaIQ+privacy+policy" },
      { label: "Terms", href: "/ask?q=AreaIQ+terms+of+service" },
      { label: "Sign In", href: "/login" },
    ],
  },
];

export default function HomeFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-[#F7F9FB]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-6">
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo size="footer" showTagline href="/" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              India&apos;s AI-powered Real Estate Intelligence Platform for Chandigarh, Mohali,
              Panchkula & Tricity.
            </p>
            <p className="mt-4 text-sm text-muted">hello@areaiq.in</p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-bold uppercase tracking-widest text-heading-primary">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={`${col.title}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted no-underline transition-colors hover:text-heading-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-neutral-200 pt-8 sm:flex-row">
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} AreaIQ. All rights reserved.
          </p>
          <p className="text-xs text-muted">Chandigarh · Mohali · Panchkula · Tricity</p>
        </div>
      </div>
    </footer>
  );
}
