"use client";

import { useEffect, useState } from "react";
import {
  fetchLeadActivities,
  fetchSellerCrmLeads,
} from "@/lib/crm/queries";
import type { CrmLeadActivity, SellerCrmLeadRow } from "@/lib/crm/types";
import SellerLeadCard from "@/components/seller/SellerLeadCard";
import { supabase } from "@/lib/supabase";

interface Props {
  sellerId: string;
}

export default function LeadsTab({ sellerId }: Props) {
  const [leads, setLeads] = useState<SellerCrmLeadRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activitiesMap, setActivitiesMap] = useState<Record<string, CrmLeadActivity[]>>({});
  const [engagementMap, setEngagementMap] = useState<
    Record<string, { saved: number; viewed: number; chats: number; visits: number }>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSellerCrmLeads(sellerId).then(async (rows) => {
      setLeads(rows);
      if (rows[0]) setExpandedId(rows[0].id);

      const buyerIds = rows.map((r) => r.buyer_id);
      if (buyerIds.length === 0) {
        setLoading(false);
        return;
      }

      const [saves, views, chats, visits] = await Promise.all([
        supabase.from("saved_properties").select("user_id").in("user_id", buyerIds),
        supabase.from("property_views").select("user_id").in("user_id", buyerIds),
        supabase.from("conversations").select("user_id").in("user_id", buyerIds),
        supabase.from("site_visits").select("user_id").in("user_id", buyerIds),
      ]);

      const countByUser = (rows: Array<{ user_id: string }> | null) => {
        const map: Record<string, number> = {};
        for (const r of rows ?? []) {
          map[r.user_id] = (map[r.user_id] ?? 0) + 1;
        }
        return map;
      };

      const saveMap = countByUser(saves.data as Array<{ user_id: string }> | null);
      const viewMap = countByUser(views.data as Array<{ user_id: string }> | null);
      const chatMap = countByUser(chats.data as Array<{ user_id: string }> | null);
      const visitMap = countByUser(visits.data as Array<{ user_id: string }> | null);

      const eng: typeof engagementMap = {};
      for (const id of buyerIds) {
        eng[id] = {
          saved: saveMap[id] ?? 0,
          viewed: viewMap[id] ?? 0,
          chats: chatMap[id] ?? 0,
          visits: visitMap[id] ?? 0,
        };
      }
      setEngagementMap(eng);
      setLoading(false);
    });
  }, [sellerId]);

  useEffect(() => {
    if (!expandedId) return;
    if (activitiesMap[expandedId]) return;
    fetchLeadActivities(expandedId, 20).then((acts) => {
      setActivitiesMap((prev) => ({ ...prev, [expandedId]: acts.reverse() }));
    });
  }, [expandedId, activitiesMap]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-neutral-200 bg-white px-6 py-20 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">
          📩
        </div>
        <h3 className="text-lg font-semibold text-heading-primary">No leads yet</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          When buyers book site visits or send inquiries, qualified lead cards appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-heading-primary">Buyer Leads</h2>
        <p className="mt-1 text-sm text-muted">
          {leads.length} active {leads.length === 1 ? "lead" : "leads"} — scored and ranked by engagement
        </p>
      </div>
      {leads.map((lead) => (
        <SellerLeadCard
          key={lead.id}
          lead={lead}
          activities={activitiesMap[lead.id] ?? []}
          expanded={expandedId === lead.id}
          engagement={engagementMap[lead.buyer_id]}
          onToggle={() => {
            setExpandedId((id) => (id === lead.id ? null : lead.id));
          }}
        />
      ))}
    </div>
  );
}
