"use client";

import { useMemo, useState } from "react";
import type { SellerPropertyRow } from "@/lib/seller/types";
import {
  PAGE_SIZE,
  btnPrimary,
  btnSecondary,
  formatDate,
  formatPrice,
  inp,
  statusBadgeClass,
} from "@/lib/seller/constants";

interface Props {
  listings: SellerPropertyRow[];
  onEdit: (prop: SellerPropertyRow) => void;
  onDelete: (id: string) => void;
  onTogglePause: (id: string, status: string) => void;
  onMarkSold: (id: string) => void;
  onDuplicate: (id: string) => void;
  onCreateListing?: () => void;
}

function PropertyActionsMenu({
  prop,
  onEdit,
  onDelete,
  onTogglePause,
  onMarkSold,
  onDuplicate,
}: {
  prop: SellerPropertyRow;
  onEdit: Props["onEdit"];
  onDelete: Props["onDelete"];
  onTogglePause: Props["onTogglePause"];
  onMarkSold: Props["onMarkSold"];
  onDuplicate: Props["onDuplicate"];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
      >
        Actions ▾
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
            <a
              href={`/property/${prop.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              View
            </a>
            <button type="button" className="block w-full px-3 py-2 text-left text-xs font-medium text-neutral-700 hover:bg-neutral-50" onClick={() => { onEdit(prop); setOpen(false); }}>Edit</button>
            <button type="button" className="block w-full px-3 py-2 text-left text-xs font-medium text-neutral-700 hover:bg-neutral-50" onClick={() => { onTogglePause(prop.id, prop.status); setOpen(false); }}>
              {prop.status === "active" ? "Pause" : "Activate"}
            </button>
            <button type="button" className="block w-full px-3 py-2 text-left text-xs font-medium text-neutral-700 hover:bg-neutral-50" onClick={() => { onMarkSold(prop.id); setOpen(false); }}>Mark Sold</button>
            <button type="button" className="block w-full px-3 py-2 text-left text-xs font-medium text-neutral-700 hover:bg-neutral-50" onClick={() => { onDuplicate(prop.id); setOpen(false); }}>Duplicate</button>
            <button type="button" className="block w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50" onClick={() => { onDelete(prop.id); setOpen(false); }}>Delete</button>
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
  onTogglePause,
  onMarkSold,
  onDuplicate,
  onCreateListing,
}: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sort, setSort] = useState<"updated" | "price_asc" | "price_desc" | "views">("updated");
  const [page, setPage] = useState(0);

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
    if (statusFilter !== "all") {
      rows = rows.filter((p) => p.status === statusFilter);
    }
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

  if (listings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-16 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-50 text-3xl">
          🏠
        </div>
        <h3 className="text-lg font-semibold text-neutral-900">No properties yet</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">
          Create your first listing to start receiving leads and tracking performance.
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
            setStatusFilter(e.target.value);
            setPage(0);
          }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="paused">Paused</option>
          <option value="sold">Sold</option>
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
        {pageRows.map((prop) => (
          <div
            key={prop.id}
            className="flex flex-wrap items-start gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md sm:p-5"
          >
            <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
              {(prop.featured_image || prop.photos?.[0]) ? (
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
                  <h3 className="font-semibold text-neutral-900">{prop.title}</h3>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {prop.location}, {prop.city}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusBadgeClass(prop.status)}`}
                >
                  {prop.status}
                </span>
              </div>
              <p className="mt-2 text-base font-bold text-emerald-600">{formatPrice(prop.price)}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-neutral-500">
                <span>👁 {prop.view_count} views</span>
                <span>📩 {prop.lead_count} leads</span>
                <span>Updated {formatDate(prop.updated_at ?? prop.created_at)}</span>
              </div>
            </div>
            <PropertyActionsMenu
              prop={prop}
              onEdit={onEdit}
              onDelete={onDelete}
              onTogglePause={onTogglePause}
              onMarkSold={onMarkSold}
              onDuplicate={onDuplicate}
            />
          </div>
        ))}
      </div>

      {filtered.length > PAGE_SIZE ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button type="button" style={btnSecondary} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="text-sm text-neutral-500">Page {page + 1} of {totalPages}</span>
          <button type="button" style={btnSecondary} disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      ) : null}
    </div>
  );
}
