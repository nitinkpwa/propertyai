"use client";

import type { StudioDocumentRef } from "@/lib/admin/property/studio/types";

interface Props {
  documents: StudioDocumentRef[];
  onRemove: (id: string) => void;
}

const CATEGORY_LABEL: Record<StudioDocumentRef["category"], string> = {
  brochure: "Brochure",
  price_list: "Price List",
  layout: "Layout",
  payment_plan: "Payment Plan",
  rera: "RERA",
  master_plan: "Master Plan",
  other: "Document",
};

export default function DocumentList({ documents, onRemove }: Props) {
  if (documents.length === 0) return null;

  return (
    <ul className="mt-4 space-y-2">
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white/80 px-3 py-2.5"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-heading-primary">{doc.name}</p>
            <p className="text-[11px] text-muted">{CATEGORY_LABEL[doc.category]} · PDF</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={doc.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              Preview
            </a>
            <button
              type="button"
              onClick={() => onRemove(doc.id)}
              className="rounded-lg border border-neutral-200 px-2 py-1 text-xs font-medium text-body hover:bg-neutral-50"
            >
              Remove
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
