"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useProgressiveProfile } from "@/components/buyer/ProgressiveProfileProvider";
import ProfileCompletionRing from "@/components/premium/ProfileCompletionRing";
import ActivityTimeline from "@/components/crm/ActivityTimeline";
import LeadStatusBadge from "@/components/crm/LeadStatusBadge";
import StepProgress from "@/components/premium/StepProgress";
import PageHeader from "@/components/ui/PageHeader";
import Card, { CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { PageSkeleton } from "@/components/ui/Skeleton";
import AiInsights, { buildDashboardInsights } from "@/components/buyer/AiInsights";
import { fetchBuyerCrmSummary } from "@/lib/crm/queries";
import { fetchSiteVisits } from "@/lib/buyer/queries";
import { PROFILE_FIELD_LABELS } from "@/lib/buyer/profileFields";
import type { BuyerCrmSummary, LeadStatus } from "@/lib/crm/types";
import { supabase } from "@/lib/supabase";
import EmptyState from "../components/EmptyState";

interface InquiryRow {
  id: string;
  message: string;
  status: string;
  created_at: string;
  property?: { title?: string; city?: string } | null;
}

const JOURNEY_STAGES: { status: LeadStatus; label: string }[] = [
  { status: "new", label: "Registered" },
  { status: "ai_qualified", label: "AI Qualified" },
  { status: "interested", label: "Viewed" },
  { status: "property_saved", label: "Saved" },
  { status: "inquiry_sent", label: "Enquiry" },
  { status: "visit_scheduled", label: "Visit Booked" },
  { status: "visited", label: "Visited" },
  { status: "negotiation", label: "Negotiation" },
  { status: "booked", label: "Token / Booked" },
  { status: "completed", label: "Sale" },
];

function getNextAction(status: LeadStatus | null, enquiries: number, visits: number): { title: string; desc: string; href: string } {
  if (!status || status === "new") {
    return { title: "Browse properties", desc: "Start exploring listings matched to your budget", href: "/properties" };
  }
  if (status === "property_saved" || enquiries === 0) {
    return { title: "Send an inquiry", desc: "Connect with sellers on properties you like", href: "/properties" };
  }
  if (visits === 0) {
    return { title: "Book a site visit", desc: "See properties in person before deciding", href: "/buyer/site-visits" };
  }
  if (status === "visited" || status === "visit_scheduled") {
    return { title: "Share visit feedback", desc: "Help AI refine your recommendations", href: "/buyer/site-visits" };
  }
  if (status === "negotiation") {
    return { title: "Review negotiation terms", desc: "Your Connect partner will follow up on pricing", href: "/buyer/crm" };
  }
  if (status === "booked") {
    return { title: "Complete documentation", desc: "Token paid — finish booking paperwork", href: "/buyer/crm" };
  }
  return { title: "Compare shortlisted properties", desc: "Make an informed decision side-by-side", href: "/buyer/compare" };
}

export default function BuyerCrmPage() {
  const { user, profile } = useAuth();
  const { completeness, openModal } = useProgressiveProfile();
  const [summary, setSummary] = useState<BuyerCrmSummary | null>(null);
  const [enquiries, setEnquiries] = useState<InquiryRow[]>([]);
  const [visitCount, setVisitCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      const [crm, inqRes, visits] = await Promise.all([
        fetchBuyerCrmSummary(user.id),
        supabase
          .from("inquiries")
          .select("id, message, status, created_at, property:properties(title, city)")
          .eq("from_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
        fetchSiteVisits(user.id),
      ]);

      setSummary(crm);
      setEnquiries((inqRes.data as InquiryRow[]) ?? []);
      setVisitCount(visits.length);
      setLoading(false);
    };

    load();
  }, [user]);

  const currentStatus = summary?.lead?.status ?? null;
  const currentStageIdx = JOURNEY_STAGES.findIndex((s) => s.status === currentStatus);

  const journeySteps = JOURNEY_STAGES.map((stage, idx) => ({
    label: stage.label,
    done: currentStageIdx >= 0 ? idx <= currentStageIdx : idx === 0,
    active: currentStageIdx === idx,
  }));

  const nextAction = getNextAction(currentStatus, enquiries.length, visitCount);

  const insights = useMemo(
    () =>
      buildDashboardInsights({
        recommendedCount: 0,
        upcomingVisits: visitCount,
        profileComplete: completeness.isComplete,
        preferredLocations: profile?.preferred_locations ?? [],
        savedCount: summary?.savedCount ?? 0,
      }),
    [visitCount, completeness.isComplete, profile?.preferred_locations, summary?.savedCount],
  );

  if (loading) return <PageSkeleton rows={4} />;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="CRM Journey"
        title="My Property Journey"
        description="Track every step from search to purchase"
        action={
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
        }
      />

      {summary?.lead ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-label">Current Stage</p>
              <div className="mt-2">
                <LeadStatusBadge status={summary.lead.status} />
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted">Lead since</p>
              <p className="text-sm font-medium text-label">
                {new Date(summary.lead.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <StepProgress steps={journeySteps} />
          </div>
        </Card>
      ) : null}

      <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Next Recommended Action</p>
        <p className="mt-2 text-lg font-bold text-heading-primary">{nextAction.title}</p>
        <p className="mt-1 text-sm text-body">{nextAction.desc}</p>
        <ButtonLink href={nextAction.href} className="mt-4">
          Take action →
        </ButtonLink>
      </Card>

      {!completeness.isComplete ? (
        <Card padding="sm" className="border-amber-100 bg-amber-50/50">
          <p className="text-sm font-semibold text-amber-900">Complete your profile</p>
          <p className="mt-1 text-xs text-amber-800">
            Missing: {completeness.missing.map((f) => PROFILE_FIELD_LABELS[f]).join(", ")}
          </p>
          <button
            type="button"
            onClick={() => openModal()}
            className="mt-2 text-xs font-semibold text-amber-700 hover:underline"
          >
            Complete now →
          </button>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Inquiries", value: summary?.enquiriesCount ?? 0, icon: "📩" },
          { label: "Saved", value: summary?.savedCount ?? 0, icon: "❤️", href: "/buyer/saved" },
          { label: "Intelligence", value: summary?.chatsCount ?? 0, icon: "🤖", href: "/ask" },
          { label: "Visits", value: summary?.visitsCount ?? 0, icon: "📅", href: "/buyer/site-visits" },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href ?? "#"}
            className={`rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${stat.href ? "" : "pointer-events-none"}`}
          >
            <span className="text-xl">{stat.icon}</span>
            <p className="mt-2 text-2xl font-bold text-heading-primary">{stat.value}</p>
            <p className="text-sm text-muted">{stat.label}</p>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader title="Activity Timeline" description="Complete history of your property journey" />
        {summary?.activities.length === 0 ? (
          <EmptyState
            icon="📊"
            title="No activity yet"
            description="Your CRM timeline will populate as you browse, save, inquire, and visit properties."
          />
        ) : (
          <ActivityTimeline activities={summary?.activities ?? []} maxItems={25} />
        )}
      </Card>

      <section id="enquiries">
        <CardHeader title="Recent Enquiries" description="Messages sent to sellers" />
        {enquiries.length === 0 ? (
          <EmptyState
            icon="📩"
            title="No enquiries yet"
            description="Send an inquiry from any property page to start a conversation with the seller."
            tips={["Include your budget and timeline in the message", "Sellers typically respond within 24 hours"]}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {enquiries.map((inq) => (
              <Card key={inq.id} padding="sm" hover>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-heading-primary">{inq.property?.title ?? "Inquiry"}</p>
                  <Badge variant={inq.status === "pending" ? "warning" : "success"}>{inq.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-body line-clamp-2">{inq.message}</p>
                <p className="mt-2 text-xs text-muted">
                  {new Date(inq.created_at).toLocaleString("en-IN")}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <AiInsights insights={insights.filter((i) => i.title.includes("compare") || i.title.includes("Prepare"))} />
    </div>
  );
}
