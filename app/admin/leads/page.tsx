"use client";

import { useEffect, useMemo, useState } from "react";
import AdminLeadsChrome from "@/components/admin/leads/AdminLeadsChrome";
import LeadTable from "@/components/admin/leads/LeadTable";
import { fetchAdminBuyers } from "@/lib/admin/queries";
import type { AdminLeadSummary } from "@/lib/admin/leads/types";

export default function AdminLeadsPage() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<AdminLeadSummary[]>([]);
  const [buyerCount, setBuyerCount] = useState(0);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const result = await fetchAdminBuyers();
      if (result.error) {
        setError(result.error);
      } else {
        setLeads(result.leads);
        setBuyerCount(result.count);
      }
      setLoading(false);
    }

    init();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((lead) => {
      if (!q) return true;
      return (
        lead.displayName.toLowerCase().includes(q) ||
        (lead.phone ?? "").toLowerCase().includes(q) ||
        (lead.email ?? "").toLowerCase().includes(q) ||
        lead.interestedLocation.toLowerCase().includes(q) ||
        lead.propertyType.toLowerCase().includes(q) ||
        lead.stage.toLowerCase().includes(q) ||
        lead.budget.toLowerCase().includes(q)
      );
    });
  }, [leads, search]);

  return (
    <AdminLeadsChrome
      title="Leads"
      subtitle={`${buyerCount} buyers`}
      backHref="/admin"
      backLabel="← Control Panel"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading-primary">Buyers</h1>
          <p className="mt-1 text-sm text-muted">
            Click any buyer to open their complete profile.
          </p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search buyers…"
          className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
        </div>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="py-20 text-center text-sm text-muted">
          {leads.length === 0 ? "No buyers yet." : "No buyers match your search."}
        </p>
      ) : (
        <LeadTable leads={filtered} />
      )}
    </AdminLeadsChrome>
  );
}
