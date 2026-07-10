"use client";

import { useState } from "react";
import PartnerStatusBadge from "@/components/admin/connect/PartnerStatusBadge";
import { supabase } from "@/lib/supabase";
import type { ConnectPartner } from "@/lib/connect/partners/types";
import { connectTokens } from "@/lib/connect/design";

interface Props {
  partner: ConnectPartner;
  onRefresh: () => void;
}

export default function SettingsPanel({ partner, onRefresh }: Props) {
  const [form, setForm] = useState({
    manager_name: partner.manager_name,
    phone: partner.phone,
    email: partner.email,
    address: partner.address ?? "",
    city: partner.city ?? "",
    gst: partner.gst ?? "",
    rera: partner.rera ?? "",
    notes: partner.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("connect_partners").update(form).eq("id", partner.id);
    setSaving(false);
    if (error) setMessage(error.message);
    else {
      setMessage("Settings saved successfully.");
      onRefresh();
    }
  };

  const fields = [
    { key: "manager_name" as const, label: "Manager Name" },
    { key: "phone" as const, label: "Phone" },
    { key: "email" as const, label: "Email" },
    { key: "city" as const, label: "City" },
    { key: "gst" as const, label: "GST" },
    { key: "rera" as const, label: "RERA" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={connectTokens.heading}>Settings</h2>
          <p className={connectTokens.subheading}>Manage your partner profile and company details</p>
        </div>
        <PartnerStatusBadge status={partner.status} />
      </div>

      <form onSubmit={handleSave} className={`${connectTokens.card} space-y-4 p-6`}>
        {message ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}
        <div>
          <label className="text-xs font-medium text-label">Company</label>
          <p className="mt-1 rounded-xl bg-neutral-50 px-3 py-2 text-sm font-medium">{partner.company_name}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs font-medium text-label">{label}</label>
              <input
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
        <div>
          <label className="text-xs font-medium text-label">Address</label>
          <textarea value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" rows={2} />
        </div>
        <div>
          <label className="text-xs font-medium text-label">Notes</label>
          <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" rows={2} />
        </div>
        <button type="submit" disabled={saving} className={connectTokens.btnPrimary}>{saving ? "Saving..." : "Save Settings"}</button>
      </form>
    </div>
  );
}
