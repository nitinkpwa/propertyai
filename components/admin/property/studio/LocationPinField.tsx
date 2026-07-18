"use client";

interface Props {
  googleMapsUrl: string;
  lat: string;
  lng: string;
  onChange: (next: { googleMapsUrl: string; lat: string; lng: string }) => void;
}

export default function LocationPinField({ googleMapsUrl, lat, lng, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
          Google Maps link
        </label>
        <input
          type="url"
          value={googleMapsUrl}
          onChange={(e) => onChange({ googleMapsUrl: e.target.value, lat, lng })}
          placeholder="https://maps.app.goo.gl/..."
          className="w-full rounded-xl border border-neutral-200 bg-white/80 px-4 py-3 text-sm text-input outline-none ring-emerald-500/30 placeholder:text-placeholder focus:ring-2"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
            Latitude
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={lat}
            onChange={(e) => onChange({ googleMapsUrl, lat: e.target.value, lng })}
            placeholder="30.642"
            className="w-full rounded-xl border border-neutral-200 bg-white/80 px-4 py-3 text-sm text-input outline-none ring-emerald-500/30 placeholder:text-placeholder focus:ring-2"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
            Longitude
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={lng}
            onChange={(e) => onChange({ googleMapsUrl, lat, lng: e.target.value })}
            placeholder="76.817"
            className="w-full rounded-xl border border-neutral-200 bg-white/80 px-4 py-3 text-sm text-input outline-none ring-emerald-500/30 placeholder:text-placeholder focus:ring-2"
          />
        </div>
      </div>
      <p className="text-xs text-muted">
        Optional — paste a Maps link or drop pin coordinates for location intelligence.
      </p>
    </div>
  );
}
