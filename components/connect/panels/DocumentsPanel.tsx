"use client";

import { useState } from "react";
import { connectTokens } from "@/lib/connect/design";
import ConnectEmptyModule from "@/app/connect/components/ConnectEmptyModule";

const DOC_TYPES = [
  { id: "brochure", label: "Brochure", icon: "📄" },
  { id: "floor_plans", label: "Floor Plans", icon: "📐" },
  { id: "price_list", label: "Price List", icon: "💰" },
  { id: "rera", label: "RERA Certificate", icon: "✅" },
  { id: "approvals", label: "Government Approvals", icon: "🏛️" },
];

interface LocalDoc {
  id: string;
  type: string;
  name: string;
  uploadedAt: string;
}

export default function DocumentsPanel() {
  const [docs, setDocs] = useState<LocalDoc[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("connect_partner_docs") ?? "[]") as LocalDoc[];
    } catch {
      return [];
    }
  });

  const handleUpload = (type: string) => {
    const name = prompt("Document name:");
    if (!name) return;
    const next = [...docs, { id: crypto.randomUUID(), type, name, uploadedAt: new Date().toISOString() }];
    setDocs(next);
    localStorage.setItem("connect_partner_docs", JSON.stringify(next));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className={connectTokens.heading}>Documents</h2>
        <p className={connectTokens.subheading}>Upload brochures, floor plans, RERA, and compliance documents for your properties</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DOC_TYPES.map((dt) => (
          <button key={dt.id} type="button" onClick={() => handleUpload(dt.id)} className={`${connectTokens.card} p-5 text-left hover:shadow-md`}>
            <span className="text-2xl">{dt.icon}</span>
            <p className="mt-2 font-semibold text-neutral-900">{dt.label}</p>
            <p className="text-xs text-emerald-600">+ Upload</p>
          </button>
        ))}
      </div>

      {docs.length === 0 ? (
        <ConnectEmptyModule icon="📄" title="No documents uploaded" description="Upload property brochures, floor plans, and RERA certificates to share with buyers during site visits." />
      ) : (
        <div className={`${connectTokens.card} divide-y`}>
          {docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-neutral-900">{d.name}</p>
                <p className="text-xs capitalize text-neutral-500">{d.type.replace(/_/g, " ")} · {new Date(d.uploadedAt).toLocaleDateString("en-IN")}</p>
              </div>
              <span className="rounded-lg bg-neutral-100 px-2 py-1 text-xs">PDF Preview</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
