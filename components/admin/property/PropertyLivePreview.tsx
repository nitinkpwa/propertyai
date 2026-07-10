"use client";

import { useMemo } from "react";
import PropertyDetailView from "@/app/property/[id]/PropertyDetailView";
import { formToPropertyDetail } from "@/lib/admin/property/mappers";
import type { AdminPropertyFormState } from "@/lib/admin/property/types";

interface Props {
  form: AdminPropertyFormState;
  propertyId?: string;
}

export default function PropertyLivePreview({ form, propertyId }: Props) {
  const property = useMemo(
    () => formToPropertyDetail(form, propertyId ?? "preview"),
    [form, propertyId],
  );

  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 shadow-inner">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white/90 px-4 py-2 backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Live Buyer Preview</p>
          <p className="text-[11px] text-muted">Updates as you edit structured fields</p>
        </div>
        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Live</span>
      </div>
      <div className="h-[calc(100vh-12rem)] overflow-y-auto bg-neutral-50">
        <div className="origin-top scale-[0.72] transform md:scale-[0.82] lg:scale-100">
          <PropertyDetailView property={property} />
        </div>
      </div>
    </div>
  );
}
