import { BRAND } from "@/lib/brand";

function absoluteUrl(path: string, base: string): string {
  if (path.startsWith("http")) return path;
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export default function BrandJsonLd() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://tech172.com";

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND.name,
    legalName: BRAND.company,
    url: base,
    logo: absoluteUrl(BRAND.assets.logo, base),
    description: BRAND.meta.description,
    email: BRAND.contact.email,
    telephone: BRAND.contact.phones[0],
    address: {
      "@type": "PostalAddress",
      streetAddress: "Plot No. 337, Industrial Area Phase II",
      addressLocality: "Chandigarh",
      postalCode: "160002",
      addressCountry: "IN",
    },
    sameAs: [BRAND.contact.website],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND.name,
    url: base,
    description: BRAND.meta.description,
    publisher: {
      "@type": "Organization",
      name: BRAND.company,
      logo: absoluteUrl(BRAND.assets.logo, base),
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${base}/ask?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
    </>
  );
}
