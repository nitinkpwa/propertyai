"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { ConnectPartnerPropertyRow } from "@/lib/connect/partners/types";
import { connectTokens } from "@/lib/connect/design";
import ConnectEmptyModule from "@/app/connect/components/ConnectEmptyModule";
import { formatPropertyPrice } from "@/lib/properties/pricingDisplay";

interface Props {
  properties: ConnectPartnerPropertyRow[];
  onRefresh: () => void;
}

export default function AssignedPropertiesPanel({ properties, onRefresh }: Props) {
  const [editing, setEditing] = useState<ConnectPartnerPropertyRow | null>(null);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const openEdit = (p: ConnectPartnerPropertyRow) => {
    setEditing(p);
    setDescription("");
  };

  const saveDescription = async () => {
    if (!editing || !description.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("properties")
      .update({ description: description.trim(), updated_at: new Date().toISOString() })
      .eq("id", editing.id);
    setSaving(false);
    if (!error) {
      setEditing(null);
      onRefresh();
    }
  };

  if (properties.length === 0) {
    return (
      <ConnectEmptyModule
        icon="🏠"
        title="No assigned properties yet"
        description="AreaIQ Admin will assign properties to your partner account. Each enquiry on assigned properties flows directly to you."
        actionLabel="Contact Support"
        onAction={() => {}}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className={connectTokens.heading}>Assigned Properties</h2>
        <p className={connectTokens.subheading}>{properties.length} properties assigned by AreaIQ — you own leads from these listings only.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {properties.map((p) => {
          const conversion = p.enquiry_count > 0 ? Math.round((p.visit_count / p.enquiry_count) * 100) : 0;
          return (
            <article key={p.id} className={`${connectTokens.card} overflow-hidden ${connectTokens.cardHover}`}>
              <div className="aspect-[16/10] bg-neutral-100">
                {p.photos?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photos[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl text-muted">🏠</div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-heading-primary">{p.title}</h3>
                    <p className="text-sm text-muted">{p.location ?? p.city}</p>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-body">{p.status}</span>
                </div>
                <p className="mt-2 text-lg font-bold text-emerald-700">
                  {formatPropertyPrice({
                    price: p.price,
                    calculated_price: (p as { calculated_price?: number | null }).calculated_price,
                    area_sqft: p.area_sqft,
                    sub_type: p.sub_type,
                    nearby_places: (p as { nearby_places?: unknown }).nearby_places,
                  }).displayPrice}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-neutral-50 p-2"><p className="text-muted">Enquiries</p><p className="font-bold text-heading-secondary">{p.enquiry_count}</p></div>
                  <div className="rounded-lg bg-neutral-50 p-2"><p className="text-muted">Visits</p><p className="font-bold text-heading-secondary">{p.visit_count}</p></div>
                  <div className="rounded-lg bg-neutral-50 p-2"><p className="text-muted">Hot Leads</p><p className="font-bold text-rose-600">{p.hot_leads}</p></div>
                  <div className="rounded-lg bg-neutral-50 p-2"><p className="text-muted">Conversion</p><p className="font-bold text-heading-secondary">{conversion}%</p></div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link href={`/property/${p.id}`} className={connectTokens.btnSecondary + " text-center text-xs"}>View</Link>
                  <button type="button" onClick={() => openEdit(p)} className={connectTokens.btnPrimary + " text-xs"}>Edit Listing</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-900/40 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-bold text-heading-primary">Edit {editing.title}</h3>
            <p className="mt-1 text-xs text-muted">Changes may require AreaIQ moderation before publishing.</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Update property description..."
              className="mt-4 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              rows={5}
            />
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={saveDescription} disabled={saving} className={connectTokens.btnPrimary}>{saving ? "Saving..." : "Save Changes"}</button>
              <button type="button" onClick={() => setEditing(null)} className={connectTokens.btnSecondary}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
