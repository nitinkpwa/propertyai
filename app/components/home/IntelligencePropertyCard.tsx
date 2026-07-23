"use client";

import Image from "next/image";
import Link from "next/link";
import { useSavedPropertyToggle } from "@/lib/buyer/useSavedProperty";
import { useComparedProperty } from "@/lib/buyer/useComparedProperty";
import { formatPriceShort } from "@/lib/home/marketSignals";
import type { IntelligencePropertyCardModel } from "@/lib/home/types";
import { isReraApproved } from "@/lib/properties/reraStatus";
import { IQ_GREEN } from "./theme";

type Props = {
  property: IntelligencePropertyCardModel;
};

export default function IntelligencePropertyCard({ property }: Props) {
  const { isSaved, handleFavoriteToggle } = useSavedPropertyToggle();
  const { compared, addAndGo, busy } = useComparedProperty(property.id);
  const saved = isSaved(property.id);

  const onSave = async () => {
    await handleFavoriteToggle(property.id, !saved);
  };

  const onCompare = async () => {
    await addAndGo();
  };

  return (
    <article className="group flex w-[min(320px,85vw)] shrink-0 flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.1)] sm:w-[340px]">
      <Link href={property.href} className="relative block aspect-[4/3] overflow-hidden bg-neutral-100 no-underline">
        {property.imageUrl ? (
          <Image
            src={property.imageUrl}
            alt={property.imageAlt ?? property.name}
            fill
            sizes="340px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="flex h-full w-full items-end bg-gradient-to-br from-neutral-700 via-neutral-600 to-emerald-700/50 p-4"
            aria-hidden
          >
            <span className="text-shadow-photo text-sm font-semibold text-white/90">
              {property.name}
            </span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {isReraApproved(property) ? (
            <span className="rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
              RERA
            </span>
          ) : null}
          {property.aiVerified ? (
            <span className="rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase text-heading-primary">
              AreaIQ Intelligence
            </span>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={property.href}
              className="line-clamp-2 text-[15px] font-bold text-heading-primary no-underline hover:text-emerald-700"
            >
              {property.name}
            </Link>
            <p className="mt-1 truncate text-xs text-muted">
              {property.location}
              {property.city ? ` · ${property.city}` : ""}
            </p>
          </div>
          <p className="shrink-0 text-sm font-bold tabular-nums" style={{ color: IQ_GREEN }}>
            {formatPriceShort(property.price)}
          </p>
        </div>

        <p className="mt-2 text-xs text-body">
          {property.builderName} · {property.bhk} BHK
          {property.area ? ` · ${property.area.toLocaleString("en-IN")} ${property.areaUnit ?? "sqft"}` : ""}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-[#F7F9FB] p-3 text-xs">
          <div>
            <p className="text-muted">AreaIQ / Investment</p>
            <p className="font-bold tabular-nums text-heading-primary">
              {property.investmentScore != null ? Math.round(property.investmentScore) : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted">Rental yield</p>
            <p className="font-bold tabular-nums text-heading-primary">
              {property.rentalYield != null ? `${property.rentalYield.toFixed(1)}%` : "—"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            href={property.href}
            className="inline-flex min-h-10 items-center justify-center rounded-xl text-xs font-bold text-white no-underline"
            style={{ backgroundColor: IQ_GREEN }}
          >
            Book Visit
          </Link>
          <Link
            href={property.askHref}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-label no-underline hover:bg-neutral-50"
          >
            Ask AreaIQ
          </Link>
          <button
            type="button"
            onClick={onCompare}
            disabled={busy}
            className={`inline-flex min-h-10 items-center justify-center rounded-xl border text-xs font-semibold disabled:opacity-60 ${
              compared
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-neutral-200 bg-white text-label hover:bg-neutral-50"
            }`}
          >
            {busy ? "…" : compared ? "In Compare" : "Compare"}
          </button>
          <button
            type="button"
            onClick={onSave}
            className={`inline-flex min-h-10 items-center justify-center rounded-xl border text-xs font-semibold ${
              saved
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-neutral-200 bg-white text-label hover:bg-neutral-50"
            }`}
          >
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
    </article>
  );
}
