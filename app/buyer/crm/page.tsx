"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useProgressiveProfile } from "@/components/buyer/ProgressiveProfileProvider";
import ProfileCompletionRing from "@/components/premium/ProfileCompletionRing";
import MetricCard from "@/components/premium/MetricCard";
import { fetchBuyerCrmSummary } from "@/lib/crm/queries";
import { fetchRecommendedPropertyCards } from "@/lib/buyer/queries";
import type { BuyerCrmSummary } from "@/lib/crm/types";
import type { PropertyCardProps } from "@/app/components/PropertyCard";
import ActivityTimeline from "@/components/crm/ActivityTimeline";
import LeadStatusBadge from "@/components/crm/LeadStatusBadge";
import PropertyCardsGrid from "@/app/buyer/components/PropertyCardsGrid";
import { PROFILE_FIELD_LABELS } from "@/lib/buyer/profileFields";
import { supabase } from "@/lib/supabase";

interface InquiryRow {
  id: string;
  message: string;
  status: string;
  created_at: string;
  property?: { title?: string; city?: string } | null;
}

export default function BuyerCrmPage() {
  const { user, profile } = useAuth();
  const { completeness, openModal } = useProgressiveProfile();
  const [summary, setSummary] = useState<BuyerCrmSummary | null>(null);
  const [enquiries, setEnquiries] = useState<InquiryRow[]>([]);
  const [recommended, setRecommended] = useState<PropertyCardProps[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      const [crm, recs, inqRes] = await Promise.all([
        fetchBuyerCrmSummary(user.id),
        fetchRecommendedPropertyCards(user.id, profile?.preferred_locations ?? [], 4),
        supabase
          .from("inquiries")
          .select("id, message, status, created_at, property:properties(title, city)")
          .eq("from_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      setSummary(crm);
      setRecommended(recs);
      setEnquiries((inqRes.data as InquiryRow[]) ?? []);
      setLoading(false);
    };

    load();
  }, [user, profile?.preferred_locations]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">CRM Journey</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            My Property Journey
          </h1>
          {summary?.lead ? (
            <div className="mt-3">
              <LeadStatusBadge status={summary.lead.status} />
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => openModal()}
          className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3"
        >
          <ProfileCompletionRing percent={completeness.percent} size="md" showLabel={false} />
          <div className="text-left">
            <p className="text-sm font-semibold text-emerald-900">{completeness.percent}% Complete</p>
            <p className="text-xs text-emerald-700">Improve recommendations</p>
          </div>
        </button>
      </div>

      {!completeness.isComplete ? (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
          <p className="text-sm font-semibold text-amber-900">Complete your profile</p>
          <p className="mt-1 text-xs text-amber-800">
            Missing: {completeness.missing.map((f) => PROFILE_FIELD_LABELS[f]).join(", ")}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon="📩" label="Inquiries" value={summary?.enquiriesCount ?? 0} accent="emerald" />
        <MetricCard icon="❤️" label="Saved" value={summary?.savedCount ?? 0} href="/buyer/saved" accent="rose" />
        <MetricCard icon="🤖" label="AI Chats" value={summary?.chatsCount ?? 0} href="/ask" accent="violet" />
        <MetricCard icon="📅" label="Visits" value={summary?.visitsCount ?? 0} href="/buyer/site-visits" accent="amber" />
      </div>

      <section>
        <h2 className="mb-4 text-lg font-bold text-neutral-900">Activity Timeline</h2>
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <ActivityTimeline activities={summary?.activities ?? []} maxItems={20} />
        </div>
      </section>

      <section id="enquiries">
        <h2 className="mb-4 text-lg font-bold text-neutral-900">Recent Enquiries</h2>
        {enquiries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 px-6 py-8 text-center text-sm text-neutral-500">
            No enquiries yet.{" "}
            <Link href="/properties" className="font-semibold text-emerald-600 hover:underline">
              Browse properties
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {enquiries.map((inq) => (
              <div key={inq.id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                <p className="font-semibold text-neutral-900">{inq.property?.title ?? "Inquiry"}</p>
                <p className="mt-1 text-sm text-neutral-600 line-clamp-2">{inq.message}</p>
                <p className="mt-2 text-xs text-neutral-400">
                  {new Date(inq.created_at).toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {recommended.length > 0 ? (
        <section>
          <h2 className="mb-4 text-lg font-bold text-neutral-900">Recommended for You</h2>
          <PropertyCardsGrid properties={recommended} columns="4" />
        </section>
      ) : null}
    </div>
  );
}
