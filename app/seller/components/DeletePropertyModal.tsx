"use client";

import { useOverlay } from "@/lib/layout/overlay";
import { btnDanger, btnSecondary } from "@/lib/seller/constants";

export default function DeletePropertyModal({
  open,
  propertyTitle,
  deleting,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  propertyTitle: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { zClassName } = useOverlay("modal", open, onCancel);

  if (!open) return null;

  return (
    <div className={`fixed inset-0 ${zClassName} flex items-center justify-center bg-black/40 p-4`}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-property-title"
        className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
      >
        <h3 id="delete-property-title" className="type-title text-heading-primary">
          Delete property?
        </h3>
        <p className="mt-2 type-caption text-muted">
          Are you sure you want to permanently delete this property?
        </p>
        {propertyTitle ? (
          <p className="mt-3 rounded-xl bg-neutral-50 px-3 py-2 type-caption font-medium text-heading-primary">
            {propertyTitle}
          </p>
        ) : null}
        <p className="mt-2 type-micro text-muted">
          Photos and listing data will be removed. This cannot be undone.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" style={btnSecondary} disabled={deleting} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            style={{ ...btnDanger, opacity: deleting ? 0.7 : 1 }}
            disabled={deleting}
            onClick={onConfirm}
          >
            {deleting ? "Deleting..." : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}
