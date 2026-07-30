"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ConnectShell from "../components/ConnectShell";
import {
  ConnectDashboardPanel,
  AssignedPropertiesPanel,
  PropertyLeadsPanel,
  PipelinePanel,
  SiteVisitsPanel,
  AnalyticsPanel,
  ActivitiesPanel,
  DocumentsPanel,
  NotificationsPanel,
  SettingsPanel,
  SupportPanel,
} from "@/components/connect/panels";
import { CONNECT_NAV, type ConnectTab } from "@/lib/connect/types";
import type {
  ConnectPartner,
  ConnectPartnerActivity,
  ConnectPartnerAnalytics,
  ConnectPartnerBuyerRow,
  ConnectPartnerPropertyRow,
} from "@/lib/connect/partners/types";
import type { ConnectSiteVisitRow } from "@/lib/crm/types";
import { fetchProfile } from "@/lib/auth/profile";
import { supabase, type Profile } from "@/lib/supabase";

const CONNECT_TABS = CONNECT_NAV.map((item) => item.key);

function parseConnectTab(value: string | null): ConnectTab {
  if (value && CONNECT_TABS.includes(value as ConnectTab)) {
    return value as ConnectTab;
  }
  return "home";
}

function ConnectDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseConnectTab(searchParams.get("tab"));
  const [profile, setProfile] = useState<Profile | null>(null);
  const [partner, setPartner] = useState<ConnectPartner | null>(null);
  const [buyers, setBuyers] = useState<ConnectPartnerBuyerRow[]>([]);
  const [properties, setProperties] = useState<ConnectPartnerPropertyRow[]>([]);
  const [activities, setActivities] = useState<ConnectPartnerActivity[]>([]);
  const [analytics, setAnalytics] = useState<ConnectPartnerAnalytics | null>(null);
  const [siteVisits, setSiteVisits] = useState<ConnectSiteVisitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleTabChange = useCallback(
    (next: ConnectTab) => {
      const href =
        next === "home"
          ? "/connect/dashboard"
          : `/connect/dashboard?tab=${next}`;
      router.replace(href, { scroll: false });
    },
    [router],
  );

  const loadDashboard = useCallback(async () => {
    const res = await fetch("/api/connect/dashboard");
    if (!res.ok) {
      setLoadError("Couldn't load your CRM right now. Check your connection and try again.");
      return;
    }
    const data = await res.json();
    setLoadError(null);
    setPartner(data.partner ?? null);
    setBuyers(data.buyers ?? []);
    setProperties(data.properties ?? []);
    setActivities(data.activities ?? []);
    setAnalytics(data.analytics ?? null);
    setSiteVisits(data.siteVisits ?? []);
  }, []);

  useEffect(() => {
    let poll: number | undefined;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/connect/login?redirect=/connect/dashboard");
        return;
      }
      const profileData = await fetchProfile(user.id);
      if (profileData?.role && profileData.role !== "builder") {
        router.push("/connect/login?redirect=/connect/dashboard");
        return;
      }
      setProfile(profileData);
      await loadDashboard();
      void fetch("/api/connect/dashboard", { method: "POST" });
      setLoading(false);
      poll = window.setInterval(() => {
        void loadDashboard();
      }, 20_000);
    })();
    return () => {
      if (poll) window.clearInterval(poll);
    };
  }, [router, loadDashboard]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/connect");
  };

  const newLeads = buyers.filter((b) => b.lead_status === "new" || b.lead_status === "inquiry_sent").length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-muted">Loading CRM...</p>
        </div>
      </div>
    );
  }

  if (loadError && !partner) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-heading-primary">CRM unavailable</p>
          <p className="mt-2 text-sm text-muted">{loadError}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadDashboard().finally(() => setLoading(false));
            }}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <ConnectShell
      tab={tab}
      onTabChange={handleTabChange}
      companyName={partner?.company_name}
      userName={profile?.full_name}
      userId={profile?.id}
      avatarUrl={profile?.avatar_url}
      newLeads={newLeads}
      onLogout={handleLogout}
    >
      {loadError ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
          {loadError}{" "}
          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      ) : null}
      {tab === "home" && analytics ? (
        <ConnectDashboardPanel
          companyName={partner?.company_name}
          userName={profile?.full_name ?? undefined}
          analytics={analytics}
          leads={buyers}
          properties={properties}
          activities={activities}
          siteVisits={siteVisits}
          onNavigate={(t) => handleTabChange(t as ConnectTab)}
        />
      ) : null}
      {tab === "properties" ? <AssignedPropertiesPanel properties={properties} onRefresh={loadDashboard} /> : null}
      {tab === "leads" ? <PropertyLeadsPanel leads={buyers} onRefresh={loadDashboard} /> : null}
      {tab === "pipeline" ? <PipelinePanel leads={buyers} onRefresh={loadDashboard} /> : null}
      {tab === "visits" ? <SiteVisitsPanel visits={siteVisits} onRefresh={loadDashboard} /> : null}
      {tab === "activities" ? <ActivitiesPanel activities={activities} /> : null}
      {tab === "documents" ? <DocumentsPanel /> : null}
      {tab === "analytics" && analytics ? <AnalyticsPanel analytics={analytics} leads={buyers} properties={properties} /> : null}
      {tab === "notifications" ? <NotificationsPanel userId={profile?.id} /> : null}
      {tab === "settings" && partner ? <SettingsPanel partner={partner} onRefresh={loadDashboard} /> : null}
      {tab === "support" ? <SupportPanel /> : null}
    </ConnectShell>
  );
}

export default function ConnectDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      }
    >
      <ConnectDashboardInner />
    </Suspense>
  );
}
