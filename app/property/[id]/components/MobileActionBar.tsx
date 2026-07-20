"use client";

import Link from "next/link";
import { useSavedProperty } from "@/lib/buyer/useSavedProperty";
import type { PropertyDetail } from "../data";
import { formatPropertyPrice } from "../data";
import { useBookSiteVisit } from "./BookSiteVisitProvider";
import { EMERALD, HeartIcon } from "./shared";

interface MobileActionBarProps {
  property: PropertyDetail;
}

export default function MobileActionBar({ property }: MobileActionBarProps) {
  const { requestBookVisit } = useBookSiteVisit();
  const { saved, toggle, saving } = useSavedProperty(property.id);

  const phone = property.contactPhone?.trim();
  const wa = property.whatsapp?.trim() || phone;
  const waLink = wa
    ? `https://wa.me/${wa.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hi, I'm interested in ${property.name} on AreaIQ`,
      )}`
    : null;
  const telLink = phone ? `tel:${phone}` : null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200/80 bg-white/95 backdrop-blur-xl lg:hidden">
      {/* Sticky price strip */}
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">Starting from</p>
          <p className="truncate text-xl font-bold tracking-tight text-heading-primary">
            {formatPropertyPrice(property)}
          </p>
        </div>
        <p className="shrink-0 text-xs text-muted">{property.configuration}</p>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={requestBookVisit}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl px-3 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(74,170,39,0.35)] active:scale-[0.98]"
          style={{ backgroundColor: EMERALD }}
        >
          Book Visit
        </button>

        {waLink ? (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700"
            aria-label="WhatsApp"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.957-1.403A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </a>
        ) : (
          <Link
            href={`/ask?propertyId=${property.id}&q=${encodeURIComponent("How can I contact the seller?")}`}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700"
            aria-label="Ask about contact"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
            </svg>
          </Link>
        )}

        {telLink ? (
          <a
            href={telLink}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-body"
            aria-label="Call"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path
                d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        ) : null}

        <button
          type="button"
          onClick={toggle}
          disabled={saving}
          aria-pressed={saved}
          aria-label={saved ? "Unsave" : "Save"}
          className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${
            saved ? "border-rose-200 bg-rose-50 text-rose-600" : "border-neutral-200 text-body"
          }`}
        >
          <HeartIcon filled={saved} />
        </button>
      </div>
    </div>
  );
}
