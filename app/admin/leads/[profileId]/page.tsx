"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminLeadsChrome from "@/components/admin/leads/AdminLeadsChrome";
import LeadProfileView from "@/components/admin/leads/LeadProfileView";
import { isAdminRole } from "@/lib/auth/admin";
import { fetchProfile } from "@/lib/auth/profile";
import type { AdminLeadProfile } from "@/lib/admin/leads/types";
import { supabase } from "@/lib/supabase/client";

export default function AdminBuyerProfilePage() {
  const router = useRouter();
  const params = useParams<{ profileId: string }>();
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<AdminLeadProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadLead = async () => {
    const res = await fetch(`/api/admin/leads/${params.profileId}`, { credentials: "include" });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Buyer not found");
      setLoading(false);
      return;
    }
    setLead((await res.json()) as AdminLeadProfile);
    setLoading(false);
  };

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/admin");
        return;
      }

      const profile = await fetchProfile(user.id);
      if (!isAdminRole(profile?.role)) {
        router.replace("/admin");
        return;
      }

      await loadLead();
    }

    init();
  }, [params.profileId, router]);

  return (
    <AdminLeadsChrome
      title={lead?.displayName ?? "Buyer Profile"}
      subtitle={lead ? `${lead.stage} · ${lead.source}` : "Loading buyer…"}
      backHref="/admin/leads"
      backLabel="← Back to Buyers"
    >
      {loading ? (
        <div className="flex justify-center py-20">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
        </div>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : lead ? (
        <LeadProfileView lead={lead} onRefresh={loadLead} />
      ) : null}
    </AdminLeadsChrome>
  );
}
