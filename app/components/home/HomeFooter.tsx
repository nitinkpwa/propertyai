import Link from "next/link";
import Logo from "@/components/common/Logo";

const FOOTER_COLUMNS = [
  {
    title: "Explore",
    links: [
      { label: "AI Assistant", href: "/ask" },
      { label: "Buy Properties", href: "/properties?type=buy" },
      { label: "Rent Properties", href: "/properties?type=rent" },
      { label: "Commercial", href: "/properties?type=commercial" },
    ],
  },
  {
    title: "Intelligence",
    links: [
      { label: "Market Trends", href: "/ask?q=Latest+market+trends+in+Tricity+2025" },
      { label: "Area Comparison", href: "/ask?q=Compare+areas+in+Tricity" },
      { label: "Investment Guide", href: "/ask?q=Best+investment+areas+Tricity" },
      { label: "Connect", href: "/connect" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "List Property", href: "/seller" },
      { label: "Sign In", href: "/login" },
    ],
  },
];

export default function HomeFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-[#F7F9FB]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo size="footer" showTagline href="/" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-500">
              AI-powered real estate intelligence for Chandigarh, Mohali, Panchkula & Tricity.
            </p>
            <p className="mt-4 text-sm text-neutral-400">hello@areaiq.in</p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-900">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-neutral-500 no-underline transition-colors hover:text-neutral-900"
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
          <p className="text-xs text-neutral-400">
            © {new Date().getFullYear()} AreaIQ. All rights reserved.
          </p>
          <p className="text-xs text-neutral-400">Chandigarh · Mohali · Panchkula · Tricity</p>
        </div>
      </div>
    </footer>
  );
}
