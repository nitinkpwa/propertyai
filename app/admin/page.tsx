"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";
import AdminEmptyState from "./components/AdminEmptyState";
import AdminSiteVisitsPanel from "./components/AdminSiteVisitsPanel";
import AdminShell, { type AdminNavItem } from "./components/AdminShell";
import ConnectPartnerAssignSelect from "@/components/admin/connect/ConnectPartnerAssignSelect";
import LegalComplianceBadge from "@/components/admin/property/LegalComplianceBadge";
import AdminBroadcastPanel from "@/components/admin/AdminBroadcastPanel";
import AdminProfileCard, {
  AdminProfileInline,
  AdminPropertySellerInline,
} from "@/components/admin/AdminProfileCard";
import BuyerProfileGrid from "@/components/crm/BuyerProfileGrid";
import DataCard, { ResponsiveDataView } from "@/components/ui/DataCard";
import { isAdminRole } from "@/lib/auth/admin";
import { signInWithEmailPassword } from "@/lib/auth/credentials";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { fetchProfile } from "@/lib/auth/profile";
import {
  ADMIN_CITIES,
  BULK_TEMPLATE,
  EMERALD,
  formatDate,
  formatDateTime,
  formatPrice,
} from "@/lib/admin/constants";
import { formatPropertyPrice } from "@/lib/properties/pricingDisplay";
import {
  approveProperty,
  buildBuilderRows,
  deleteProperty,
  fetchAdminData,
  getPendingProperties,
  rejectProperty,
  updatePropertyStatus,
} from "@/lib/admin/queries";
import { adminRowToForm } from "@/lib/admin/property/mappers";
import {
  matchesLegalComplianceFilter,
  resolveLegalVerificationFromProperty,
  type LegalComplianceFilter,
} from "@/lib/admin/property/legalVerification";
import { createEmptyAdminPropertyForm } from "@/lib/admin/property/types";
import type { AdminPropertyFormState } from "@/lib/admin/property/types";
import {
  buildProfileLookup,
  profileMatchesSearch,
  resolveProfileDisplay,
  roleBadgeClass,
} from "@/lib/admin/profileDisplay";
import type {
  AdminConversationRow,
  AdminData,
  AdminPropertyRow,
  AdminTab,
} from "@/lib/admin/types";
import { PROPERTY_STATUS_DEFAULT_CREATE, PROPERTY_STATUS_LABELS } from "@/lib/properties/status";
import { saveAdminProperty } from "@/lib/admin/property/saveProperty";
import { supabase } from "@/lib/supabase/client";

const PropertyStudio = dynamic(
  () => import("@/components/admin/property/studio/PropertyStudio"),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center py-16">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
      </div>
    ),
  },
);
const AdminCrmPanel = dynamic(() => import("@/components/crm/AdminCrmPanel"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center py-16">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
    </div>
  ),
});
const AdminConnectPanel = dynamic(
  () => import("@/components/admin/connect/AdminConnectPanel"),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center py-16">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
      </div>
    ),
  },
);

type AdminAccessState = "loading" | "signed_out" | "ready";

const ADMIN_SETUP_HINT =
  "No admin account is configured yet. Create a user in Supabase Dashboard → Authentication → Users, add a matching row in Table Editor → profiles (same id), and set role to admin.";

function statusBadgeClass(status: string): string {
  if (status === "active" || status === "approved") return "bg-emerald-50 text-emerald-700";
  if (status === "pending" || status === "rejected") return "bg-amber-50 text-amber-700";
  if (status === "paused") return "bg-amber-50 text-amber-700";
  return "bg-neutral-100 text-body";
}

function getChatSummary(msgs: Array<{ role: string; content: string }> | undefined): string {
  if (!msgs?.length) return "No messages";
  const userMsgs = msgs.filter((m) => m.role === "user");
  if (!userMsgs.length) return "No user messages";
  return `${userMsgs.map((m) => m.content).join(" | ").slice(0, 150)}...`;
}

function getInterest(msgs: Array<{ role: string; content: string }> | undefined): string {
  if (!msgs?.length) return "General";
  const text = msgs
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ")
    .toLowerCase();
  if (text.includes("buy") || text.includes("purchase")) return "Buyer";
  if (text.includes("rent") || text.includes("lease")) return "Renter";
  if (text.includes("invest")) return "Investor";
  if (text.includes("sell")) return "Seller";
  if (text.includes("commercial") || text.includes("office")) return "Commercial";
  return "General";
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <div className="group min-w-[148px] shrink-0 snap-start rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition-all active:scale-[0.99] lg:min-w-0 lg:hover:-translate-y-0.5 lg:hover:shadow-md sm:p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 text-lg lg:group-hover:bg-emerald-50">
        {icon}
      </div>
      <p className="text-2xl font-bold tracking-tight text-heading-primary lg:text-3xl">{value}</p>
      <p className="mt-1 text-sm font-medium text-body">{label}</p>
    </div>
  );
}

const ADMIN_TABS: AdminTab[] = [
  "dashboard",
  "properties",
  "pending",
  "users",
  "builders",
  "leads",
  "crm",
  "visits",
  "chats",
  "analytics",
  "settings",
  "add",
  "bulk",
];

function parseAdminTab(value: string | null): AdminTab {
  if (value && ADMIN_TABS.includes(value as AdminTab)) {
    return value as AdminTab;
  }
  return "dashboard";
}

function AdminPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accessState, setAccessState] = useState<AdminAccessState>("loading");
  const tab = parseAdminTab(searchParams.get("tab"));
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(false);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [adminDisplayName, setAdminDisplayName] = useState<string | null>(null);
  const [wizardForm, setWizardForm] = useState<AdminPropertyFormState>(() => createEmptyAdminPropertyForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [bulkCsv, setBulkCsv] = useState("");
  const [bulkResult, setBulkResult] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [complianceFilter, setComplianceFilter] = useState<LegalComplianceFilter>("all");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [selectedChat, setSelectedChat] = useState<AdminConversationRow | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [supabaseRoleWarning, setSupabaseRoleWarning] = useState<string | null>(null);

  useEffect(() => {
    async function verifyAdminAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAccessState("signed_out");
        return;
      }

      const profile = await fetchProfile(user.id);
      if (isAdminRole(profile?.role)) {
        setAdminUserId(user.id);
        setAdminDisplayName(profile?.full_name || profile?.email || null);
        setAccessState("ready");
        return;
      }

      await supabase.auth.signOut();
      setLoginError(
        `Access denied. Signed-in account does not have profiles.role = admin. ${ADMIN_SETUP_HINT}`,
      );
      setAccessState("signed_out");
    }

    verifyAdminAccess();
  }, []);

  const loadAll = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setAdminUserId(user.id);
      setSupabaseRoleWarning(null);
    }

    const adminData = await fetchAdminData();
    setData(adminData);
    setLoading(false);
  };

  useEffect(() => {
    if (accessState === "ready") loadAll();
  }, [accessState]);

  // One-time upgrade of legacy AI listings into multi-unit pricing / plot-range schema
  useEffect(() => {
    if (accessState !== "ready") return;
    if (typeof window === "undefined") return;
    const key = "areaiq_pricing_normalized_v1";
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void fetch("/api/admin/properties/normalize-pricing", { method: "POST" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.updated > 0) void loadAll();
      })
      .catch(() => {
        /* non-blocking */
      });
  }, [accessState]);

  const logoutAdmin = async () => {
    await supabase.auth.signOut();
    setAccessState("signed_out");
    setAdminEmail("");
    setAdminPassword("");
    setLoginError("");
    setAdminUserId(null);
    setData(null);
    setSupabaseRoleWarning(null);
  };

  const goToTab = (next: AdminTab) => {
    if (next === "leads") {
      router.push("/admin/leads");
      return;
    }
    setSearchQ("");
    setUserRoleFilter("all");
    setStatusFilter("all");
    const href = next === "dashboard" ? "/admin" : `/admin?tab=${next}`;
    router.replace(href, { scroll: false });
  };

  const handleAdminLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError("");

    const email = adminEmail.trim().toLowerCase();
    if (!email || !adminPassword) {
      setLoginError("Enter your admin email and password.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLoginError("Enter a valid email address.");
      return;
    }

    try {
      const { user } = await signInWithEmailPassword(email, adminPassword);
      const profile = await fetchProfile(user.id);

      if (!isAdminRole(profile?.role)) {
        await supabase.auth.signOut();
        setLoginError(
          `Access denied. This account does not have profiles.role = admin. ${ADMIN_SETUP_HINT}`,
        );
        return;
      }

      setAdminUserId(user.id);
      setAccessState("ready");
      setAdminPassword("");
      router.refresh();
    } catch (err) {
      setLoginError(getAuthErrorMessage(err));
    }
  };

  const properties = data?.properties ?? [];
  const profiles = data?.profiles ?? [];
  const profileCount = data?.profileCount ?? profiles.length;
  const profileLookup = useMemo(() => buildProfileLookup(profiles), [profiles]);
  const leads = data?.leads ?? [];
  const conversations = data?.conversations ?? [];
  const siteVisits = data?.siteVisits ?? [];
  const stats = data?.stats;
  const analytics = data?.analytics;
  const usesApprovalStatus = data?.usesApprovalStatus ?? false;
  const pendingProperties = useMemo(
    () => getPendingProperties(properties, usesApprovalStatus),
    [properties, usesApprovalStatus],
  );
  const builders = useMemo(
    () => buildBuilderRows(profiles, properties),
    [profiles, properties],
  );

  const navItems: AdminNavItem[] = [
    { key: "dashboard", label: "Dashboard", icon: "📊" },
    { key: "properties", label: "Properties", icon: "🏠", count: properties.length },
    { key: "pending", label: "Pending Approval", icon: "⏳", count: pendingProperties.length },
    { key: "users", label: "Users", icon: "👤", count: profileCount },
    { key: "builders", label: "AreaIQ Connect", icon: "🤝", count: builders.length },
    { key: "leads", label: "Leads", icon: "📩", count: leads.length },
    { key: "crm", label: "CRM", icon: "🔗" },
    { key: "visits", label: "Site Visits", icon: "📅", count: siteVisits.length },
    { key: "chats", label: "Intelligence Sessions", icon: "🤖", count: conversations.length },
    { key: "analytics", label: "Analytics", icon: "📈" },
    { key: "broadcasts", label: "Broadcasts", icon: "📢" },
    { key: "add", label: editId ? "Edit Property" : "AI Property Studio", icon: "✨" },
    { key: "bulk", label: "Bulk Import", icon: "📋" },
    { key: "settings", label: "Settings", icon: "⚙️" },
  ];

  const filteredProperties = properties.filter((p) => {
    const q = searchQ.toLowerCase();
    const matchesSearch =
      !q ||
      p.title?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) ||
      p.contact_name?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesCompliance = matchesLegalComplianceFilter(
      resolveLegalVerificationFromProperty(p),
      complianceFilter,
    );
    return matchesSearch && matchesStatus && matchesCompliance;
  });

  const filteredUsers = profiles.filter((p) => {
    const q = searchQ.toLowerCase();
    const matchesSearch =
      !q ||
      p.full_name?.toLowerCase().includes(q) ||
      p.phone?.includes(q) ||
      p.email?.toLowerCase().includes(q);
    const matchesRole = userRoleFilter === "all" || String(p.role) === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const startEdit = (p: AdminPropertyRow) => {
    setEditId(p.id);
    setWizardForm(adminRowToForm(p));
    goToTab("add");
  };

  const resetWizard = () => {
    setEditId(null);
    setWizardForm(createEmptyAdminPropertyForm());
  };

  const handleBulkImport = async () => {
    if (!bulkCsv.trim() || !adminUserId) return;
    setBulkLoading(true);
    setBulkResult([]);
    const lines = bulkCsv.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());
    const results: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(",").map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = vals[idx] || "";
      });
      if (!row.title || !row.price || !row.city) {
        results.push(`Row ${i}: SKIP — missing title/price/city`);
        continue;
      }
      const form = createEmptyAdminPropertyForm();
      form.title = row.title;
      form.type = (row.type as AdminPropertyFormState["type"]) || "buy";
      form.sub_type = (row.sub_type as AdminPropertyFormState["sub_type"]) || "flat";
      form.price = row.price;
      form.area_sqft = row.area_sqft || "";
      form.bedrooms = row.bedrooms || "";
      form.bathrooms = row.bathrooms || "";
      form.city = row.city;
      form.location = row.location || row.city;
      form.contact_name = row.contact_name || "";
      form.contact_phone = row.contact_phone || "";
      form.status = PROPERTY_STATUS_DEFAULT_CREATE;
      form.publishing.workflowStatus = "review";
      // CSV description flows into factual description via project/config fields when present.
      if (row.description) {
        form.basic.project = row.description.slice(0, 120);
      }
      const saved = await saveAdminProperty(form, adminUserId, null);
      results.push(
        saved.ok
          ? `Row ${i} (${row.title}): ✅ Added (pending review)`
          : `Row ${i} (${row.title}): ERROR — ${saved.error ?? "save failed"}`,
      );
    }
    setBulkResult(results);
    setBulkLoading(false);
    await loadAll();
  };

  if (accessState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
      </div>
    );
  }

  if (accessState === "signed_out") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4">
        <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col items-center text-center">
            <h1 className="text-xl font-bold text-heading-primary">Admin Dashboard</h1>
            <p className="mt-2 text-sm text-muted">
              Sign in with your Supabase admin account
            </p>
          </div>

          {loginError ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {loginError}
            </div>
          ) : null}

          <form onSubmit={handleAdminLogin} className="space-y-1">
            <AuthInput
              label="Admin Email"
              type="email"
              autoComplete="email"
              placeholder="admin@example.com"
              value={adminEmail}
              onChange={(event) => setAdminEmail(event.target.value)}
            />
            <AuthInput
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
            />
            <div className="pt-2">
              <AuthButton type="submit">Access Admin</AuthButton>
            </div>
          </form>

          <p className="mt-4 text-center text-xs leading-relaxed text-muted">
            {ADMIN_SETUP_HINT}
          </p>

          <a
            href="/"
            className="mt-4 block text-center text-sm text-muted no-underline hover:text-heading-secondary"
          >
            ← Back to website
          </a>
        </div>
      </div>
    );
  }

  /*
  TODO(production): Restore forbidden state when using Supabase admin roles:
  if (accessState === "forbidden") { ... access denied UI ... }
  */

  const searchInput = (
    <input
      placeholder="Search..."
      value={searchQ}
      onChange={(e) => setSearchQ(e.target.value)}
      className="w-full max-w-xs rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-heading-primary outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
    />
  );

  return (
    <AdminShell
      tab={tab}
      onTabChange={goToTab}
      navItems={navItems}
      onLogout={logoutAdmin}
      onAddProperty={() => {
        resetWizard();
        goToTab("add");
      }}
    >
      {supabaseRoleWarning ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {supabaseRoleWarning}
        </div>
      ) : null}
      {loading && !data ? (
        <div className="flex justify-center py-20">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
        </div>
      ) : null}

      {tab === "dashboard" && stats ? (
        <div>
          <h1 className="mb-6 text-[28px] font-bold tracking-tight text-heading-primary lg:text-2xl">
            Dashboard Overview
          </h1>
          <div className="-mx-4 flex gap-3 overflow-x-auto scroll-touch px-4 pb-1 snap-x snap-mandatory sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 sm:snap-none md:grid-cols-3 xl:grid-cols-4">
            <StatCard icon="🏠" label="Total Properties" value={stats.totalProperties} />
            <StatCard icon="⏳" label="Pending Properties" value={stats.pendingProperties} />
            <StatCard icon="✅" label="Approved Properties" value={stats.approvedProperties} />
            <StatCard icon="🛒" label="Buyers" value={stats.buyers} />
            <StatCard icon="🏷️" label="Sellers" value={stats.sellers} />
            <StatCard icon="🏗️" label="Builders" value={stats.builders} />
            <StatCard icon="📅" label="Site Visits" value={stats.siteVisits} />
            <StatCard icon="🤖" label="Intelligence Sessions" value={stats.aiChats} />
            <StatCard icon="📩" label="Leads" value={stats.leads} />
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-heading-primary">Latest Leads</h2>
              {leads.slice(0, 5).map((l) => (
                <Link
                  key={l.id}
                  href={`/admin/leads/${l.from_user_id}`}
                  className="flex items-center justify-between border-b border-neutral-100 py-3 last:border-0 hover:bg-neutral-50/80"
                >
                  <AdminProfileInline
                    profile={l.buyer}
                    profileId={l.from_user_id}
                    lookup={profileLookup}
                  />
                  <div className="ml-3 min-w-0 flex-1">
                    <p className="truncate text-xs text-muted">{l.property?.title ?? "—"}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(l.status)}`}>
                    {l.status}
                  </span>
                </Link>
              ))}
              {leads.length === 0 ? <p className="text-sm text-muted">No leads yet</p> : null}
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-heading-primary">Recent Intelligence Sessions</h2>
              {conversations.slice(0, 5).map((c) => (
                <div key={c.id} className="border-b border-neutral-100 py-3 last:border-0">
                  <AdminProfileInline profile={c.user} profileId={c.user_id} lookup={profileLookup} />
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{getChatSummary(c.messages)}</p>
                </div>
              ))}
              {conversations.length === 0 ? (
                <p className="text-sm text-muted">No AI conversations yet</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "properties" ? (
        <div>
          <div className="sticky top-chrome z-layout-sticky -mx-4 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200/80 bg-[#FAFAFA]/95 px-4 py-3 backdrop-blur-md sm:-mx-0 sm:static sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none md:top-auto">
            <h1 className="text-xl font-bold text-heading-primary sm:text-2xl">
              Property Command Center
            </h1>
            <button
              type="button"
              onClick={() => {
                resetWizard();
                goToTab("add");
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
            >
              <span aria-hidden>+</span>
              Add Property
            </button>
          </div>
          <div className="mb-4 flex flex-wrap gap-3">
            {searchInput}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="paused">Pending Review</option>
              <option value="sold">Sold</option>
              <option value="rented">Rented</option>
            </select>
            <select
              value={complianceFilter}
              onChange={(e) => setComplianceFilter(e.target.value as LegalComplianceFilter)}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="all">All compliance</option>
              <option value="verified">Verified (≥90%)</option>
              <option value="partial">Partial (30–89%)</option>
              <option value="missing">Missing (&lt;30%)</option>
              <option value="rera_pending">RERA Pending</option>
              <option value="bank_approved">Bank Approved</option>
              <option value="govt_approved">Government Approved</option>
            </select>
          </div>
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm lg:border">
            <ResponsiveDataView
              table={
                <div className="overflow-x-auto">
                  <table className="admin-data-table w-full min-w-[1100px] table-fixed text-sm">
                    <colgroup>
                      <col className="w-[18%]" />
                      <col className="w-[7%]" />
                      <col className="w-[9%]" />
                      <col className="w-[8%]" />
                      <col className="w-[14%]" />
                      <col className="w-[14%]" />
                      <col className="w-[7%]" />
                      <col className="w-[9%]" />
                      <col className="w-[7%]" />
                      <col className="w-[7%]" />
                    </colgroup>
                    <thead className="border-b border-neutral-200 bg-neutral-50">
                      <tr>
                        {[
                          "Property",
                          "Type",
                          "Price",
                          "City",
                          "Seller",
                          "Connect Partner",
                          "Status",
                          "Compliance",
                          "Date",
                          "Actions",
                        ].map((h) => (
                          <th
                            key={h}
                            className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-label"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProperties.map((prop) => (
                        <tr key={prop.id} className="border-b border-neutral-100 hover:bg-neutral-50/50">
                          <td className="px-4 py-3">
                            <p className="truncate font-medium text-heading-primary">{prop.title}</p>
                            <p className="truncate text-xs text-muted">{prop.sub_type}</p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 capitalize text-body">{prop.type}</td>
                          <td className="whitespace-nowrap px-4 py-3 font-semibold text-emerald-700">
                            {formatPropertyPrice({
                              price: prop.price,
                              calculated_price: prop.calculated_price,
                              area_sqft: prop.area_sqft,
                              sub_type: prop.sub_type,
                              nearby_places: (prop as { nearby_places?: unknown }).nearby_places,
                            }).displayPrice}
                          </td>
                          <td className="truncate px-4 py-3 text-body">{prop.city}</td>
                          <td className="px-4 py-3">
                            <AdminPropertySellerInline property={prop} lookup={profileLookup} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {prop.connect_partner?.company_name ? (
                                <p className="truncate text-xs font-medium text-emerald-700">
                                  {prop.connect_partner.company_name}
                                </p>
                              ) : null}
                              <ConnectPartnerAssignSelect
                                propertyId={prop.id}
                                currentPartnerId={prop.connect_partner_id}
                                onAssigned={loadAll}
                              />
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(prop.status)}`}>
                              {PROPERTY_STATUS_LABELS[prop.status as keyof typeof PROPERTY_STATUS_LABELS] ?? prop.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <LegalComplianceBadge flags={resolveLegalVerificationFromProperty(prop)} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{formatDate(prop.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-nowrap gap-1">
                              <Link href={`/admin/properties/${prop.id}`} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">CMS</Link>
                              <button type="button" onClick={() => startEdit(prop)} className="rounded-lg border border-neutral-200 px-2 py-1 text-xs font-medium hover:bg-neutral-50">Edit</button>
                              <button type="button" onClick={async () => {
                                const result = await updatePropertyStatus(prop.id, prop.status === "active" ? "paused" : "active");
                                if (!result.ok) {
                                  window.alert(result.error ?? "Could not update status");
                                  return;
                                }
                                await loadAll();
                              }} className="rounded-lg border border-neutral-200 px-2 py-1 text-xs font-medium hover:bg-neutral-50">{prop.status === "active" ? "Pause" : "Activate"}</button>
                              <button type="button" onClick={async () => { if (confirm("Delete this property?")) { await deleteProperty(prop.id); await loadAll(); } }} className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              }
              cards={
                <div className="space-y-3 p-3 sm:p-4">
                  {filteredProperties.map((prop) => {
                    const priceLabel = formatPropertyPrice({
                      price: prop.price,
                      calculated_price: prop.calculated_price,
                      area_sqft: prop.area_sqft,
                      sub_type: prop.sub_type,
                      nearby_places: (prop as { nearby_places?: unknown }).nearby_places,
                    }).displayPrice;
                    return (
                      <DataCard
                        key={prop.id}
                        title={prop.title}
                        subtitle={`${prop.city} · ${prop.type}`}
                        badges={
                          <span className="inline-flex flex-wrap items-center gap-1.5">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(prop.status)}`}>
                              {PROPERTY_STATUS_LABELS[prop.status as keyof typeof PROPERTY_STATUS_LABELS] ?? prop.status}
                            </span>
                            <LegalComplianceBadge flags={resolveLegalVerificationFromProperty(prop)} />
                          </span>
                        }
                        meta={[
                          { label: "Price", value: priceLabel },
                          { label: "Listed", value: formatDate(prop.created_at) },
                        ]}
                        expandedContent={
                          <div className="space-y-2">
                            <ConnectPartnerAssignSelect
                              propertyId={prop.id}
                              currentPartnerId={prop.connect_partner_id}
                              onAssigned={loadAll}
                            />
                          </div>
                        }
                        actions={[
                          {
                            id: "cms",
                            label: "Open CMS",
                            onClick: () => router.push(`/admin/properties/${prop.id}`),
                          },
                          {
                            id: "edit",
                            label: "Edit",
                            onClick: () => startEdit(prop),
                          },
                          {
                            id: "toggle",
                            label: prop.status === "active" ? "Pause" : "Activate",
                            onClick: async () => {
                              const result = await updatePropertyStatus(
                                prop.id,
                                prop.status === "active" ? "paused" : "active",
                              );
                              if (!result.ok) {
                                window.alert(result.error ?? "Could not update status");
                                return;
                              }
                              await loadAll();
                            },
                          },
                          {
                            id: "delete",
                            label: "Delete",
                            danger: true,
                            onClick: async () => {
                              if (confirm("Delete this property?")) {
                                await deleteProperty(prop.id);
                                await loadAll();
                              }
                            },
                          },
                        ]}
                      />
                    );
                  })}
                </div>
              }
            />
            {filteredProperties.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted">No properties found</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "pending" ? (
        <div>
          <h1 className="mb-2 text-2xl font-bold text-heading-primary">Pending Approval</h1>
          {!usesApprovalStatus ? (
            <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              The <code className="font-mono">approval_status</code> column is not in your database. Showing properties with status <strong>paused</strong> as pending review. Approve sets status to <strong>active</strong> (live) without requiring a Connect Partner; reject keeps <strong>paused</strong> for seller edits.
            </p>
          ) : null}
          {pendingProperties.length === 0 ? (
            <AdminEmptyState icon="⏳" title="No pending properties" description="Properties awaiting approval will appear here." />
          ) : (
            <div className="space-y-4">
              {pendingProperties.map((prop) => (
                <article key={prop.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                  <div className="border-b border-neutral-100 px-5 py-4">
                    <p className="font-semibold text-heading-primary">{prop.title}</p>
                    <p className="mt-1 text-sm text-muted">
                      {prop.city} ·{" "}
                      {formatPropertyPrice({
                        price: prop.price,
                        calculated_price: prop.calculated_price,
                        area_sqft: prop.area_sqft,
                        sub_type: prop.sub_type,
                        nearby_places: (prop as { nearby_places?: unknown }).nearby_places,
                      }).displayPrice}
                      {prop.connect_partner?.company_name ? (
                        <span className="ml-2 text-emerald-700">
                          · {prop.connect_partner.company_name}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                    <AdminProfileCard
                      variant="compact"
                      profile={{
                        ...(prop.seller ?? {}),
                        full_name: prop.seller?.full_name ?? prop.contact_name ?? undefined,
                        phone: prop.seller?.phone ?? prop.contact_phone ?? undefined,
                        role: prop.seller?.role ?? "seller",
                      }}
                      profileId={prop.seller_id}
                      lookup={profileLookup}
                      status={usesApprovalStatus ? prop.approval_status ?? "pending" : prop.status}
                      statusClassName={statusBadgeClass(
                        usesApprovalStatus ? prop.approval_status ?? "pending" : prop.status,
                      )}
                      subtitle="Listing owner"
                      className="flex-1 border-0 bg-transparent p-0"
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={async () => {
                        const result = await approveProperty(prop.id);
                        if (!result.ok) {
                          window.alert(result.error ?? "Could not approve property");
                          return;
                        }
                        await loadAll();
                      }} className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white">Approve</button>
                      <button type="button" onClick={async () => { await rejectProperty(prop.id); await loadAll(); }} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600">Reject</button>
                      <button type="button" onClick={() => startEdit(prop)} className="rounded-xl border border-neutral-200 px-4 py-2 text-xs font-semibold text-body">Edit</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === "users" ? (
        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-heading-primary">Users</h1>
            <div className="flex flex-wrap gap-3">
              {searchInput}
              <select value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)} className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm">
                <option value="all">All roles</option>
                <option value="buyer">Buyers</option>
                <option value="seller">Sellers</option>
                <option value="builder">Builders</option>
                <option value="admin">Admins</option>
              </select>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="admin-data-table w-full min-w-[900px] table-fixed text-sm">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[14%]" />
                <col className="w-[22%]" />
                <col className="w-[12%]" />
                <col className="w-[14%]" />
                <col className="w-[16%]" />
              </colgroup>
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  {["User", "Phone", "Email", "Role", "Joined", "Status"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-label">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((p) => {
                  const resolved = resolveProfileDisplay(p);
                  return (
                  <tr key={p.id} className="border-b border-neutral-100">
                    <td className="px-4 py-3">
                      <AdminProfileInline profile={p} />
                    </td>
                    <td className="px-4 py-3 text-body">{resolved.phone || "—"}</td>
                    <td className="px-4 py-3 text-body">{resolved.email || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${roleBadgeClass(p.role)}`}>
                        {resolved.roleLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Active</span></td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredUsers.length === 0 ? <p className="py-12 text-center text-sm text-muted">No users found</p> : null}
          </div>
          </div>
        </div>
      ) : null}

      {tab === "builders" ? <AdminConnectPanel /> : null}

      {tab === "crm" ? <AdminCrmPanel profileLookup={profileLookup} /> : null}

      {tab === "visits" ? (
        <AdminSiteVisitsPanel
          siteVisits={siteVisits}
          hasSiteVisitsTable={Boolean(data?.hasSiteVisitsTable)}
          profileLookup={profileLookup}
        />
      ) : null}

      {tab === "chats" ? (
        <div>
          <h1 className="mb-6 text-2xl font-bold text-heading-primary">Intelligence Sessions</h1>
          {!data?.hasConversationsTable ? (
            <AdminEmptyState icon="🤖" title="Conversations table not available" description="The conversations table is not accessible. AI chat history will appear here when available." />
          ) : conversations.length === 0 ? (
            <AdminEmptyState icon="🤖" title="No intelligence sessions yet" description="User AreaIQ Intelligence sessions will appear here." />
          ) : (
            <div className={`grid gap-4 ${selectedChat ? "lg:grid-cols-2" : ""}`}>
              <div className="space-y-2">
                {conversations.filter((c) => {
                  const resolved = resolveProfileDisplay(c.user, {
                    profileId: c.user_id,
                    lookup: profileLookup,
                  });
                  const q = searchQ.toLowerCase();
                  return !q || profileMatchesSearch(resolved, q);
                }).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedChat(selectedChat?.id === c.id ? null : c)}
                    className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition-all ${selectedChat?.id === c.id ? "border-emerald-300 ring-1 ring-emerald-200" : "border-neutral-200 hover:shadow-md"}`}
                  >
                    <AdminProfileCard
                      variant="compact"
                      profile={c.user}
                      profileId={c.user_id}
                      lookup={profileLookup}
                      status={getInterest(c.messages)}
                      statusClassName="bg-neutral-100 text-body"
                      subtitle={`${formatDateTime(c.created_at)} · ${c.messages?.length ?? 0} messages`}
                      className="border-0 bg-transparent p-0"
                    />
                    <p className="mt-2 line-clamp-2 text-sm text-body">{getChatSummary(c.messages)}</p>
                  </button>
                ))}
              </div>
              {selectedChat ? (
                <div className="sticky top-24 max-h-[70vh] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                  <div className="border-b border-neutral-100 px-4 py-3">
                    <AdminProfileCard
                      variant="compact"
                      profile={selectedChat.user}
                      profileId={selectedChat.user_id}
                      lookup={profileLookup}
                      status={getInterest(selectedChat.messages)}
                      statusClassName="bg-neutral-100 text-body"
                      subtitle={`Started ${formatDateTime(selectedChat.created_at)}`}
                      className="border-0 bg-transparent p-0"
                    />
                  </div>
                  <div className="max-h-[60vh] space-y-3 overflow-y-auto p-4">
                    {(selectedChat.messages ?? []).map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${msg.role === "user" ? "bg-emerald-500 text-white" : "bg-neutral-100 text-heading-primary"}`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {tab === "analytics" && analytics ? (
        <div>
          <h1 className="mb-6 text-2xl font-bold text-heading-primary">Analytics</h1>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-heading-primary">Properties by Status</h2>
              {analytics.propertiesByStatus.map((row) => (
                <div key={row.status} className="mb-2 flex items-center gap-3">
                  <span className="w-24 capitalize text-sm text-body">{row.status}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, (row.count / Math.max(stats?.totalProperties ?? 1, 1)) * 100)}%` }} />
                  </div>
                  <span className="w-8 text-right text-sm font-semibold text-heading-primary">{row.count}</span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-heading-primary">Leads by Status</h2>
              {analytics.leadsByStatus.length === 0 ? <p className="text-sm text-muted">No lead data</p> : null}
              {analytics.leadsByStatus.map((row) => (
                <div key={row.status} className="mb-2 flex justify-between border-b border-neutral-100 py-2 text-sm">
                  <span className="capitalize text-body">{row.status}</span>
                  <span className="font-semibold text-heading-primary">{row.count}</span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-heading-primary">Users by Role</h2>
              {analytics.usersByRole.map((row) => (
                <div key={row.role} className="mb-2 flex justify-between border-b border-neutral-100 py-2 text-sm">
                  <span className="capitalize text-body">{row.role}</span>
                  <span className="font-semibold text-heading-primary">{row.count}</span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-heading-primary">Properties by City</h2>
              {analytics.propertiesByCity.map((row) => (
                <div key={row.city} className="mb-2 flex justify-between border-b border-neutral-100 py-2 text-sm">
                  <span className="text-body">{row.city}</span>
                  <span className="font-semibold text-heading-primary">{row.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "broadcasts" ? <AdminBroadcastPanel /> : null}

      {tab === "settings" ? (
        <div>
          <h1 className="mb-6 text-2xl font-bold text-heading-primary">Settings</h1>
          <div className="space-y-4">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-heading-primary">Admin Access</h2>
              <p className="mt-2 text-sm text-muted">MVP session gate. Sign out to require admin credentials again.</p>
              <button type="button" onClick={logoutAdmin} className="mt-4 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-label hover:bg-neutral-50">Sign Out</button>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-heading-primary">Supabase Connection</h2>
              <p className="mt-2 text-sm text-muted">Property CRUD, users, leads, and chats load from your live Supabase project.</p>
              <p className="mt-2 text-xs text-muted">Admin user ID: {adminUserId ?? "Not signed in to Supabase"}</p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-heading-primary">Schema Notes</h2>
              <ul className="mt-3 space-y-2 text-sm text-body">
                <li>• Approval workflow: {usesApprovalStatus ? "using approval_status column" : "using status field fallback (paused → pending)"}</li>
                <li>• Site visits: {data?.hasSiteVisitsTable ? "connected" : "table not found"}</li>
                <li>• Intelligence Sessions: {data?.hasConversationsTable ? "connected" : "table not accessible"}</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-heading-primary">Developer Health Check</h2>
              <p className="mt-2 text-sm text-muted">
                Env, Supabase, OpenAI, cache, migrations, storage, and runtime diagnostics.
              </p>
              <Link
                href="/admin/system"
                className="mt-4 inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Open system health →
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "add" && adminUserId ? (
        <PropertyStudio
          key={editId ?? "new"}
          adminUserId={adminUserId}
          adminDisplayName={adminDisplayName}
          editId={editId}
          initialForm={wizardForm}
          existingTitles={properties.map((p) => ({
            title: p.title || "",
            builder: "builder_name" in p && typeof p.builder_name === "string" ? p.builder_name : "",
            city: p.city || "",
          }))}
          onSaved={async () => {
            resetWizard();
            await loadAll();
            goToTab("properties");
          }}
          onCancel={() => {
            resetWizard();
            goToTab("properties");
          }}
        />
      ) : null}

      {tab === "bulk" ? (
        <div>
          <h1 className="mb-2 text-2xl font-bold text-heading-primary">Bulk Import</h1>
          <p className="mb-6 text-sm text-muted">Import multiple properties using CSV format.</p>
          <div className="w-full max-w-none rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="mb-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium">Upload CSV</button>
              <button type="button" onClick={() => setBulkCsv(BULK_TEMPLATE)} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">Load Example</button>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.txt" hidden onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => setBulkCsv(ev.target?.result as string); r.readAsText(f); }} />
            <textarea value={bulkCsv} onChange={(e) => setBulkCsv(e.target.value)} className="h-64 w-full rounded-xl border border-neutral-200 p-3 font-mono text-xs lg:h-80" placeholder="Paste CSV..." />
            <div className="mt-4 flex gap-3">
              <button type="button" disabled={bulkLoading || !bulkCsv.trim()} onClick={handleBulkImport} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: EMERALD }}>{bulkLoading ? "Importing..." : "Import Properties"}</button>
              <button type="button" onClick={() => { setBulkCsv(""); setBulkResult([]); }} className="rounded-xl border border-neutral-200 px-5 py-2.5 text-sm font-medium">Clear</button>
            </div>
            {bulkResult.length > 0 ? (
              <div className="mt-4 max-h-48 overflow-y-auto rounded-xl bg-neutral-50 p-4 font-mono text-xs">
                {bulkResult.map((r, i) => <div key={i} className={r.includes("✅") ? "text-emerald-700" : "text-red-600"}>{r}</div>)}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-neutral-50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      }
    >
      <AdminPageInner />
    </Suspense>
  );
}
