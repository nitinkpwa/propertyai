"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import type { ConnectTab } from "@/lib/connect/types";
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

export default function ConnectDashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<ConnectTab>("home");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [partner, setPartner] = useState<ConnectPartner | null>(null);
  const [buyers, setBuyers] = useState<ConnectPartnerBuyerRow[]>([]);
  const [properties, setProperties] = useState<ConnectPartnerPropertyRow[]>([]);
  const [activities, setActivities] = useState<ConnectPartnerActivity[]>([]);
  const [analytics, setAnalytics] = useState<ConnectPartnerAnalytics | null>(null);
  const [siteVisits, setSiteVisits] = useState<ConnectSiteVisitRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    const res = await fetch("/api/connect/dashboard");
    if (!res.ok) return;
    const data = await res.json();
    setPartner(data.partner ?? null);
    setBuyers(data.buyers ?? []);
    setProperties(data.properties ?? []);
    setActivities(data.activities ?? []);
    setAnalytics(data.analytics ?? null);
    setSiteVisits(data.siteVisits ?? []);
  }, []);

  useEffect(() => {
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
    })();
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
          <p className="text-sm text-neutral-500">Loading CRM...</p>
        </div>
      </div>
    );
  }

  return (
    <ConnectShell
      tab={tab}
      onTabChange={setTab}
      companyName={partner?.company_name}
      userName={profile?.full_name}
      userId={profile?.id}
      avatarUrl={profile?.avatar_url}
      newLeads={newLeads}
      onLogout={handleLogout}
    >
      {tab === "home" && analytics ? (
        <ConnectDashboardPanel
          companyName={partner?.company_name}
          userName={profile?.full_name ?? undefined}
          analytics={analytics}
          leads={buyers}
          properties={properties}
          activities={activities}
          siteVisits={siteVisits}
          onNavigate={(t) => setTab(t as ConnectTab)}
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
