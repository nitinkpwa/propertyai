"use client";

import { useRef, useState } from "react";
import type { SellerProfile } from "@/lib/seller/types";
import { btnPrimary, btnSecondary, inp, lbl } from "@/lib/seller/constants";

interface Props {
  profile: SellerProfile;
  onSave: (data: Partial<SellerProfile>) => Promise<boolean>;
  onUploadAvatar: (file: File) => Promise<string | null>;
}

export default function ProfileTab({ profile, onSave, onUploadAvatar }: Props) {
  const [form, setForm] = useState({
    full_name: profile.full_name ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    city: profile.city ?? "",
  });
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setSaving(true);
    const ok = await onSave(form);
    setMsg(ok ? "✅ Profile updated" : "Failed to update profile");
    setSaving(false);
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-neutral-900">Seller Profile</h2>
      <p className="mt-1 text-sm text-neutral-500">Manage your account details.</p>

      {msg ? (
        <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${msg.includes("✅") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {msg}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-6">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-center">
          <label style={lbl}>Profile Photo</label>
          <div className="mx-auto mb-3 h-20 w-20 overflow-hidden rounded-full bg-white ring-2 ring-neutral-200">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-2xl text-neutral-300">👤</div>
            )}
          </div>
          <input ref={avatarRef} type="file" accept="image/*" hidden onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) await onUploadAvatar(f);
          }} />
          <button type="button" style={btnSecondary} onClick={() => avatarRef.current?.click()}>Upload Photo</button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {([
          ["full_name", "Full Name"],
          ["email", "Email"],
          ["phone", "Phone"],
          ["city", "City"],
        ] as const).map(([key, label]) => (
          <div key={key}>
            <label style={lbl}>{label}</label>
            <input style={inp} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
          </div>
        ))}
      </div>

      <button type="button" style={{ ...btnPrimary, marginTop: "1.5rem", opacity: saving ? 0.7 : 1 }} disabled={saving} onClick={handleSave}>
        {saving ? "Saving..." : "Save Profile"}
      </button>
    </div>
  );
}
