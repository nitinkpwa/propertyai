"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useChromeElement } from "@/components/layout/engine";
import { useSavedProperty } from "@/lib/buyer/useSavedProperty";
import { useComparedProperty } from "@/lib/buyer/useComparedProperty";
import { zClass } from "@/lib/layout/zIndex";
import type { PropertyDetail } from "../data";
import { formatPropertyPrice } from "../data";
import { useBookSiteVisit } from "./BookSiteVisitProvider";
import { EMERALD, HeartIcon, ShareIcon } from "./shared";

interface MobileActionBarProps {
  property: PropertyDetail;
}

export default function MobileActionBar({ property }: MobileActionBarProps) {
  const { requestBookVisit } = useBookSiteVisit();
  const { saved, toggle, saving } = useSavedProperty(property.id);
  const { compared, toggle: toggleCompare, busy: comparing } = useComparedProperty(property.id);
  const [shared, setShared] = useState(false);
  const chromeRef = useChromeElement("actionbar", true, "property-action-bar");

  const phone = property.contactPhone?.trim();
  const wa = property.whatsapp?.trim() || phone;
  const waLink = wa
    ? `https://wa.me/${wa.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hi, I'm interested in ${property.name} on AreaIQ`,
      )}`
    : null;

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const text = `Check out ${property.name} on AreaIQ`;
    try {
      if (navigator.share) {
        await navigator.share({ title: property.name, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      /* cancelled */
    }
  }, [property.name]);

  return (
    <div
      ref={chromeRef}
      className={`fixed inset-x-0 bottom-0 ${zClass.nav} border-t border-neutral-200/80 bg-white/95 backdrop-blur-xl lg:hidden`}
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-2">
        <div className="min-w-0">
          <p className="type-micro font-medium text-muted">Starting from</p>
          <p className="truncate type-title tracking-tight text-heading-primary">
            {formatPropertyPrice(property)}
          </p>
        </div>
        <p className="shrink-0 type-micro text-muted">{property.configuration}</p>
      </div>

      <div className="flex items-center gap-1.5 px-2.5 py-2.5 sm:gap-2 sm:px-3">
        <button
          type="button"
          onClick={requestBookVisit}
          className="inline-flex min-h-12 min-w-0 flex-1 items-center justify-center rounded-xl px-2.5 type-label text-white shadow-[0_2px_8px_rgba(74,170,39,0.35)] active:scale-[0.98] sm:px-3"
          style={{ backgroundColor: EMERALD }}
        >
          Book Visit
        </button>

        <button
          type="button"
          onClick={() => void toggleCompare()}
          disabled={comparing}
          aria-pressed={compared}
          aria-label={compared ? "Remove from compare" : "Compare"}
          className={`touch-target inline-flex shrink-0 items-center justify-center rounded-xl border ${
            compared
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-neutral-200 text-body"
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M16 3h5v5M4 21L20.5 4.5M21 16v5h-5M4 21l5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleShare}
          aria-label={shared ? "Link copied" : "Share"}
          className="touch-target inline-flex shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-body"
        >
          <ShareIcon />
        </button>

        {waLink ? (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="touch-target inline-flex shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700"
            aria-label="WhatsApp"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.957-1.403A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </a>
        ) : (
          <Link
            href={`/ask?propertyId=${property.id}&q=${encodeURIComponent("How can I contact the seller?")}`}
            className="touch-target inline-flex shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700"
            aria-label="Ask about contact"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
            </svg>
          </Link>
        )}

        <button
          type="button"
          onClick={toggle}
          disabled={saving}
          aria-pressed={saved}
          aria-label={saved ? "Unsave" : "Save"}
          className={`touch-target inline-flex shrink-0 items-center justify-center rounded-xl border ${
            saved ? "border-rose-200 bg-rose-50 text-rose-600" : "border-neutral-200 text-body"
          }`}
        >
          <HeartIcon filled={saved} />
        </button>
      </div>
    </div>
  );
}
