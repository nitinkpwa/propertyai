"use client";

import { useMemo, useState } from "react";
import {
  matchesSellerStatusFilter,
  sellerListingBadge,
  sellerListingBadgeClass,
  type SellerStatusFilter,
} from "@/lib/seller/listingStatus";
import type { SellerPropertyRow } from "@/lib/seller/types";
import {
  PAGE_SIZE,
  btnPrimary,
  btnSecondary,
  formatDate,
  inp,
} from "@/lib/seller/constants";
import { formatPropertyPrice } from "@/lib/properties/pricingDisplay";
import DeletePropertyModal from "./DeletePropertyModal";

interface Props {
  listings: SellerPropertyRow[];
  onEdit: (prop: SellerPropertyRow) => void;
  onDelete: (prop: SellerPropertyRow) => Promise<boolean>;
  onDuplicate: (prop: SellerPropertyRow) => Promise<void>;
  onPreview: (prop: SellerPropertyRow) => void;
  onCreateListing?: () => void;
  busyId?: string | null;
}

function PropertyActionsMenu({
  prop,
  busy,
  onEdit,
  onDeleteRequest,
  onDuplicate,
  onPreview,
}: {
  prop: SellerPropertyRow;
  busy: boolean;
  onEdit: Props["onEdit"];
  onDeleteRequest: () => void;
  onDuplicate: Props["onDuplicate"];
  onPreview: Props["onPreview"];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-body transition-colors hover:bg-neutral-50 disabled:opacity-50"
      >
        Actions ▾
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-xs font-medium text-body hover:bg-neutral-50"
              onClick={() => {
                onEdit(prop);
                setOpen(false);
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-xs font-medium text-body hover:bg-neutral-50"
              onClick={() => {
                onPreview(prop);
                setOpen(false);
              }}
            >
              Preview
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-xs font-medium text-body hover:bg-neutral-50"
              onClick={() => {
                void onDuplicate(prop);
                setOpen(false);
              }}
            >
              Duplicate
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50"
              onClick={() => {
                onDeleteRequest();
                setOpen(false);
              }}
            >
              Delete
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function MyPropertiesTab({
  listings,
  onEdit,
  onDelete,
  onDuplicate,
  onPreview,
  onCreateListing,
  busyId = null,
}: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SellerStatusFilter>("all");
  const [sort, setSort] = useState<"updated" | "price_asc" | "price_desc" | "views">("updated");
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<SellerPropertyRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    let rows = [...listings];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q),
      );
    }
    rows = rows.filter((p) =>
      matchesSellerStatusFilter(p.status, p.nearby_places, statusFilter),
    );
    rows.sort((a, b) => {
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      if (sort === "views") return b.view_count - a.view_count;
      const aT = new Date(a.updated_at ?? a.created_at).getTime();
      const bT = new Date(b.updated_at ?? b.created_at).getTime();
      return bT - aT;
    });
    return rows;
  }, [listings, search, statusFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const ok = await onDelete(deleteTarget);
    setDeleting(false);
    if (ok) setDeleteTarget(null);
  };

  if (listings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-16 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-50 text-3xl">
          🏠
        </div>
        <h3 className="text-lg font-semibold text-heading-primary">No properties yet</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          Create your first listing.
        </p>
        {onCreateListing ? (
          <button type="button" onClick={onCreateListing} style={btnPrimary} className="mt-6">
            Create your first listing
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          style={inp}
          placeholder="Search by name or location..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
        <select
          style={{ ...inp, width: "100%" }}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as SellerStatusFilter);
            setPage(0);
          }}
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="pending_review">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="sold">Sold</option>
          <option value="rented">Rented</option>
        </select>
        <select
          style={{ ...inp, width: "100%" }}
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
        >
          <option value="updated">Last Updated</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="views">Most Views</option>
        </select>
      </div>

      <div className="space-y-3">
        {pageRows.map((prop) => {
          const badge = sellerListingBadge(prop.status, prop.nearby_places);
          return (
            <div
              key={prop.id}
              className="flex flex-wrap items-start gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md sm:p-5"
            >
              <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                {prop.featured_image || prop.photos?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={prop.featured_image || prop.photos[0]}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl">🏠</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-heading-primary">{prop.title}</h3>
                    <p className="mt-0.5 text-xs text-muted">
                      {prop.location}, {prop.city}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${sellerListingBadgeClass(badge)}`}
                  >
                    {badge}
                  </span>
                </div>
                <p className="mt-2 text-base font-bold text-emerald-600">
                  {formatPropertyPrice({
                    price: prop.price,
                    calculated_price: prop.calculated_price,
                    area_sqft: prop.area_sqft,
                    sub_type: prop.sub_type,
                    nearby_places: prop.nearby_places,
                  }).displayPrice}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
                  <span>👁 {prop.view_count} views</span>
                  <span>📩 {prop.lead_count} leads</span>
                  <span>Updated {formatDate(prop.updated_at ?? prop.created_at)}</span>
                </div>
              </div>
              <PropertyActionsMenu
                prop={prop}
                busy={busyId === prop.id}
                onEdit={onEdit}
                onDeleteRequest={() => setDeleteTarget(prop)}
                onDuplicate={onDuplicate}
                onPreview={onPreview}
              />
            </div>
          );
        })}
      </div>

      {filtered.length > PAGE_SIZE ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button type="button" style={btnSecondary} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="text-sm text-muted">
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            style={btnSecondary}
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      ) : null}

      <DeletePropertyModal
        open={Boolean(deleteTarget)}
        propertyTitle={deleteTarget?.title ?? ""}
        deleting={deleting}
        onCancel={() => (deleting ? null : setDeleteTarget(null))}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
