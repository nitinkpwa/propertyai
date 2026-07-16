"use client";

import { useRef } from "react";
import type { PropertyFormState } from "@/lib/seller/types";
import {
  CITIES,
  FURNISHING_OPTIONS,
  POSSESSION_OPTIONS,
  SUB_TYPES,
  TYPES,
  btnPrimary,
  btnSecondary,
  inp,
  lbl,
} from "@/lib/seller/constants";

interface Props {
  form: PropertyFormState;
  setForm: (f: PropertyFormState) => void;
  photoUrls: string[];
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (index: number) => void;
  editId: string | null;
  saving: boolean;
  uploadingPhotos: boolean;
  saveMsg: string;
  onSave: (asDraft: boolean) => void;
  onCancel: () => void;
}

export default function PropertyFormTab({
  form,
  setForm,
  photoUrls,
  onPhotoChange,
  onRemovePhoto,
  editId,
  saving,
  uploadingPhotos,
  saveMsg,
  onSave,
  onCancel,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (key: keyof PropertyFormState, value: string) =>
    setForm({ ...form, [key]: value });

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-heading-primary">
        {editId ? "Edit Property" : "Add New Property"}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {editId
          ? "Update your listing details. AreaIQ publishes after review."
          : "Submit your listing for AreaIQ review. Publishing requires Connect Partner assignment."}
      </p>

      {saveMsg ? (
        <div
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            saveMsg.includes("✅") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {saveMsg}
        </div>
      ) : null}

      <div className="mt-6">
        <label style={lbl}>Photos (up to 6)</label>
        <div className="mb-2 flex flex-wrap gap-3">
          {photoUrls.map((url, i) => (
            <div key={i} className="relative h-20 w-[100px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full rounded-xl border border-neutral-200 object-cover" />
              <button
                type="button"
                onClick={() => onRemovePhoto(i)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] text-white"
              >
                ×
              </button>
            </div>
          ))}
          {photoUrls.length < 6 ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-20 w-[100px] items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 text-xs text-muted transition-colors hover:border-emerald-300 hover:bg-emerald-50"
            >
              📷 Add
            </button>
          ) : null}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onPhotoChange} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label style={lbl}>Property Name *</label>
          <input style={inp} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. 3BHK Flat in Phase 8 Mohali" />
        </div>
        <div>
          <label style={lbl}>Category (Listing Type) *</label>
          <select style={inp} value={form.type} onChange={(e) => set("type", e.target.value)}>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Property Type *</label>
          <select style={inp} value={form.sub_type} onChange={(e) => set("sub_type", e.target.value)}>
            {SUB_TYPES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Builder</label>
          <input style={inp} value={form.builder_name} onChange={(e) => set("builder_name", e.target.value)} placeholder="Builder / Developer name" />
        </div>
        <div>
          <label style={lbl}>Price (₹) *</label>
          <input style={inp} type="number" value={form.price} onChange={(e) => set("price", e.target.value)} />
        </div>
        <div>
          <label style={lbl}>Area (sq ft)</label>
          <input style={inp} type="number" value={form.area_sqft} onChange={(e) => set("area_sqft", e.target.value)} />
        </div>
        <div>
          <label style={lbl}>Bedrooms</label>
          <input style={inp} type="number" value={form.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} />
        </div>
        <div>
          <label style={lbl}>Bathrooms</label>
          <input style={inp} type="number" value={form.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} />
        </div>
        <div>
          <label style={lbl}>Furnishing</label>
          <select style={inp} value={form.furnishing} onChange={(e) => set("furnishing", e.target.value)}>
            <option value="">Select</option>
            {FURNISHING_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Parking</label>
          <input style={inp} value={form.parking} onChange={(e) => set("parking", e.target.value)} placeholder="e.g. 1 Covered + 1 Open" />
        </div>
        <div>
          <label style={lbl}>Facing</label>
          <input style={inp} value={form.facing} onChange={(e) => set("facing", e.target.value)} placeholder="e.g. East, Park Facing" />
        </div>
        <div>
          <label style={lbl}>Possession</label>
          <select style={inp} value={form.possession} onChange={(e) => set("possession", e.target.value)}>
            <option value="">Select</option>
            {POSSESSION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>RERA Number</label>
          <input style={inp} value={form.rera_number} onChange={(e) => set("rera_number", e.target.value)} />
        </div>
        <div>
          <label style={lbl}>City *</label>
          <select style={inp} value={form.city} onChange={(e) => set("city", e.target.value)}>
            {CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Sector / Area</label>
          <input style={inp} value={form.sector} onChange={(e) => set("sector", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label style={lbl}>Location / Address *</label>
          <input style={inp} value={form.location} onChange={(e) => set("location", e.target.value)} />
        </div>
        <div>
          <label style={lbl}>Latitude</label>
          <input style={inp} value={form.lat} onChange={(e) => set("lat", e.target.value)} placeholder="e.g. 30.7046" />
        </div>
        <div>
          <label style={lbl}>Longitude</label>
          <input style={inp} value={form.lng} onChange={(e) => set("lng", e.target.value)} placeholder="e.g. 76.7179" />
        </div>
        <div className="sm:col-span-2">
          <label style={lbl}>Google Map Location (paste Maps link)</label>
          <input
            style={inp}
            placeholder="https://maps.google.com/..."
            onChange={(e) => {
              const v = e.target.value;
              setForm({ ...form, location: form.location || v });
            }}
          />
        </div>
        <div className="sm:col-span-2">
          <label style={lbl}>Description</label>
          <textarea style={{ ...inp, height: 90, resize: "vertical" }} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label style={lbl}>Amenities (comma separated)</label>
          <input style={inp} value={form.amenities} onChange={(e) => set("amenities", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label style={lbl}>Nearby Places (comma separated or JSON array)</label>
          <input style={inp} value={form.nearby_places} onChange={(e) => set("nearby_places", e.target.value)} placeholder="School, Hospital, Metro..." />
        </div>
        <div className="sm:col-span-2">
          <label style={lbl}>Featured Image URL (optional — defaults to first photo)</label>
          <input style={inp} value={form.featured_image} onChange={(e) => set("featured_image", e.target.value)} />
        </div>
        <div>
          <label style={lbl}>Contact Name</label>
          <input style={inp} value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} />
        </div>
        <div>
          <label style={lbl}>Contact Phone *</label>
          <input style={inp} value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving || uploadingPhotos}
          style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}
          onClick={() => onSave(false)}
        >
          {uploadingPhotos
            ? "Uploading..."
            : saving
              ? "Saving..."
              : editId
                ? "Update Property"
                : "Submit for Review"}
        </button>
        <button type="button" disabled={saving} style={btnSecondary} onClick={() => onSave(true)}>
          Save as Draft
        </button>
        <button type="button" style={btnSecondary} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
