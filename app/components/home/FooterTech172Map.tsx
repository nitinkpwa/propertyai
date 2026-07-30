"use client";

import { useEffect, useState } from "react";
import SocialLinks from "@/components/common/SocialLinks";
import { BRAND } from "@/lib/brand";

/**
 * Single Tech172 Intelligence contact card + Google Map.
 * Falls back to an open-in-Maps preview if the embed fails to load.
 */
export default function FooterTech172Map() {
  const [embedOk, setEmbedOk] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const frame = document.getElementById(
        "tech172-map-embed",
      ) as HTMLIFrameElement | null;
      if (!frame) return;
      try {
        const rect = frame.getBoundingClientRect();
        if (rect.width < 40 || rect.height < 40) setEmbedOk(false);
      } catch {
        /* ignore */
      }
    }, 2500);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section
      className="mt-12 border-t border-neutral-200 pt-10"
      aria-labelledby="footer-tech172-heading"
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-stretch lg:gap-6">
        {/* Contact card */}
        <div className="flex h-full flex-col rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] sm:p-6">
          <h2
            id="footer-tech172-heading"
            className="text-2xl font-bold tracking-tight text-heading-primary sm:text-[1.75rem] sm:leading-tight"
          >
            Tech172 Intelligence
          </h2>

          <dl className="mt-6 space-y-5 text-[15px] leading-relaxed text-muted">
            <div>
              <dt className="text-[13px] font-semibold tracking-wide text-heading-primary">
                📍 Office Address
              </dt>
              <dd className="mt-1.5">
                <address className="not-italic leading-relaxed">
                  {BRAND.contact.addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              </dd>
            </div>

            <div>
              <dt className="text-[13px] font-semibold tracking-wide text-heading-primary">
                📞 Phone Numbers
              </dt>
              <dd className="mt-1.5 space-y-1.5">
                {BRAND.contact.phones.map((phone) => (
                  <a
                    key={phone}
                    href={`tel:${phone.replace(/\s/g, "")}`}
                    className="block text-muted no-underline transition-colors hover:text-heading-primary"
                  >
                    {phone}
                  </a>
                ))}
              </dd>
            </div>

            <div>
              <dt className="text-[13px] font-semibold tracking-wide text-heading-primary">
                ✉ Email
              </dt>
              <dd className="mt-1.5">
                <a
                  href={`mailto:${BRAND.contact.email}`}
                  className="text-muted no-underline transition-colors hover:text-heading-primary"
                >
                  {BRAND.contact.email}
                </a>
              </dd>
            </div>

            <div>
              <dt className="text-[13px] font-semibold tracking-wide text-heading-primary">
                🌐 Website
              </dt>
              <dd className="mt-1.5">
                <a
                  href={BRAND.contact.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-emerald-700 no-underline transition-colors hover:text-emerald-800"
                >
                  {BRAND.contact.websiteLabel}
                </a>
              </dd>
            </div>
          </dl>

          <a
            href={BRAND.maps.directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
            style={{ backgroundColor: "#4AAA27" }}
          >
            Get Directions
          </a>

          <div className="mt-6 border-t border-neutral-200/90 pt-5">
            <SocialLinks
              brand="tech172"
              variant="light"
              label="Follow Tech172"
              iconSize={24}
            />
          </div>
        </div>

        {/* Map card */}
        <div className="flex h-full min-h-[260px] flex-col rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
          <div className="relative min-h-[220px] flex-1 overflow-hidden rounded-2xl bg-neutral-100 lg:min-h-0">
            {embedOk ? (
              <iframe
                id="tech172-map-embed"
                title="Tech172 Intelligence office on Google Maps"
                src={BRAND.maps.embedSrc}
                className="absolute inset-0 block h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                onError={() => setEmbedOk(false)}
              />
            ) : (
              <a
                href={BRAND.maps.openUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-emerald-50 via-white to-neutral-100 px-6 text-center no-underline transition-colors hover:from-emerald-100/80"
              >
                <span className="text-3xl" aria-hidden>
                  🗺️
                </span>
                <span className="text-base font-semibold text-heading-primary">
                  Open in Google Maps
                </span>
                <span className="max-w-xs text-sm leading-relaxed text-muted">
                  {BRAND.contact.addressLines.join(" ")}
                </span>
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
