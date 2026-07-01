"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ConnectEmptyModule from "../components/ConnectEmptyModule";
import ConnectShell from "../components/ConnectShell";
import ConnectCrmPanel from "@/components/crm/ConnectCrmPanel";
import { fetchConnectDashboardStats } from "@/lib/connect/queries";
import type { ConnectDashboardStats, ConnectTab } from "@/lib/connect/types";
import { fetchProfile } from "@/lib/auth/profile";
import { supabase, type Profile } from "@/lib/supabase";

const TAB_TITLES: Record<ConnectTab, string> = {
  home: "Dashboard",
  projects: "Projects",
  inventory: "Inventory",
  leads: "Leads",
  partners: "Channel Partners",
  visits: "Site Visits",
  analytics: "Analytics",
  documents: "Documents",
  profile: "Company Profile",
  notifications: "Notifications",
};

const MODULE_EMPTY: Record<
  Exclude<ConnectTab, "home">,
  { icon: string; title: string; description: string }
> = {
  projects: {
    icon: "🏗️",
    title: "No projects yet",
    description: "Create your first project to organize towers, phases, and launches.",
  },
  inventory: {
    icon: "📦",
    title: "No inventory yet",
    description: "Add units to track availability, pricing, and booking status.",
  },
  leads: {
    icon: "📩",
    title: "No leads yet",
    description: "Verified buyer inquiries from AreaIQ will appear here.",
  },
  partners: {
    icon: "🤝",
    title: "No channel partners yet",
    description: "Invite brokers and sales teams to collaborate on your projects.",
  },
  visits: {
    icon: "📅",
    title: "No site visits yet",
    description: "Scheduled buyer visits for your listings will show up here.",
  },
  analytics: {
    icon: "📈",
    title: "No analytics yet",
    description: "Performance insights will appear once you have projects and leads.",
  },
  documents: {
    icon: "📄",
    title: "No documents yet",
    description: "Upload brochures, floor plans, and compliance documents.",
  },
  profile: {
    icon: "🏢",
    title: "Complete your company profile",
    description: "Add verification details to build buyer trust on AreaIQ Connect.",
  },
  notifications: {
    icon: "🔔",
    title: "No notifications yet",
    description: "Lead updates, visit requests, and system alerts will appear here.",
  },
};

function DashboardHome({ stats }: { stats: ConnectDashboardStats }) {
  const cards = [
    { icon: "🏗️", label: "Projects", value: stats.projects, description: "Active projects" },
    { icon: "📦", label: "Inventory Units", value: stats.inventoryUnits, description: "Available units" },
    { icon: "📩", label: "New Leads", value: stats.newLeads, description: "Unread inquiries" },
    { icon: "🤝", label: "Channel Partners", value: stats.channelPartners, description: "Active partners" },
    { icon: "📅", label: "Site Visits", value: stats.siteVisits, description: "Scheduled visits" },
    { icon: "🏠", label: "Properties Listed", value: stats.propertiesListed, description: "Your listings" },
    { icon: "📩", label: "Total Leads", value: stats.totalLeads, description: "All inquiries" },
    { icon: "📄", label: "Documents", value: stats.documents, description: "Uploaded files" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-neutral-900">Dashboard Overview</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Live metrics from your AreaIQ Connect account.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="group rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 text-lg transition-colors group-hover:bg-emerald-50">
              {card.icon}
            </div>
            <p className="text-3xl font-bold tracking-tight text-neutral-900">{card.value}</p>
            <p className="mt-1 text-sm font-semibold text-neutral-800">{card.label}</p>
            <p className="mt-0.5 text-xs text-neutral-500">{card.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompanyProfileCard({ profile }: { profile: Profile }) {
  const fields = [
    ["Company", profile.company ?? "—"],
    ["Contact", profile.full_name ?? "—"],
    ["Phone", profile.phone ?? "—"],
    ["Email", profile.email ?? "—"],
    ["City", profile.city ?? "—"],
    ["GST", profile.gst ?? "—"],
    ["RERA", profile.rera_number ?? "—"],
  ] as const;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-neutral-900">Company Profile</h3>
      <p className="mt-1 text-sm text-neutral-500">
        Your registered builder details on AreaIQ Connect.
      </p>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-neutral-50 px-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              {label}
            </dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function ConnectDashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<ConnectTab>("home");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ConnectDashboardStats>({
    projects: 0,
    inventoryUnits: 0,
    newLeads: 0,
    channelPartners: 0,
    siteVisits: 0,
    documents: 0,
    propertiesListed: 0,
    totalLeads: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async (userId: string) => {
    const [profileData, statsData] = await Promise.all([
      fetchProfile(userId),
      fetchConnectDashboardStats(userId),
    ]);
    if (profileData) setProfile(profileData);
    setStats(statsData);
  }, []);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/connect/login?redirect=/connect/dashboard");
        return;
      }

      const profileData = await fetchProfile(user.id);
      if (profileData?.role && profileData.role !== "builder") {
        router.push("/connect/login?redirect=/connect/dashboard");
        return;
      }

      await loadDashboard(user.id);
      setLoading(false);
    })();
  }, [router, loadDashboard]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/connect");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-neutral-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <ConnectShell
      tab={tab}
      onTabChange={setTab}
      companyName={profile?.company}
      userName={profile?.full_name}
      avatarUrl={profile?.avatar_url}
      newLeads={stats.newLeads}
      onLogout={handleLogout}
    >
      {tab !== "home" ? (
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
            {TAB_TITLES[tab]}
          </h2>
        </div>
      ) : null}

      {tab === "home" ? <DashboardHome stats={stats} /> : null}
      {tab === "profile" && profile ? <CompanyProfileCard profile={profile} /> : null}
      {tab === "leads" && profile ? (
        <ConnectCrmPanel connectPartnerId={profile.id} mode="leads" />
      ) : null}
      {tab === "visits" && profile ? (
        <ConnectCrmPanel connectPartnerId={profile.id} mode="visits" />
      ) : null}
      {tab === "inventory" && profile ? (
        <ConnectCrmPanel connectPartnerId={profile.id} mode="properties" />
      ) : null}
      {tab !== "home" &&
      tab !== "profile" &&
      tab !== "leads" &&
      tab !== "visits" &&
      tab !== "inventory" ? (
        <ConnectEmptyModule {...MODULE_EMPTY[tab]} />
      ) : null}
    </ConnectShell>
  );
}
