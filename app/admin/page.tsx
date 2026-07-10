"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";
import AdminEmptyState from "./components/AdminEmptyState";
import AdminShell, { type AdminNavItem } from "./components/AdminShell";
import AdminConnectPanel from "@/components/admin/connect/AdminConnectPanel";
import ConnectPartnerAssignSelect from "@/components/admin/connect/ConnectPartnerAssignSelect";
import PropertyWizard from "@/components/admin/property/PropertyWizard";
import AdminCrmPanel from "@/components/crm/AdminCrmPanel";
import AdminProfileCard, {
  AdminProfileInline,
  AdminPropertySellerInline,
} from "@/components/admin/AdminProfileCard";
import BuyerProfileGrid from "@/components/crm/BuyerProfileGrid";
import Logo from "@/components/common/Logo";
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
import { supabase } from "@/lib/supabase/client";

type AdminAccessState = "loading" | "signed_out" | "ready";

const ADMIN_SETUP_HINT =
  "No admin account is configured yet. Create a user in Supabase Dashboard → Authentication → Users, add a matching row in Table Editor → profiles (same id), and set role to admin.";

function statusBadgeClass(status: string): string {
  if (status === "active" || status === "approved") return "bg-emerald-50 text-emerald-700";
  if (status === "draft" || status === "pending") return "bg-amber-50 text-amber-700";
  if (status === "paused" || status === "rejected") return "bg-red-50 text-red-700";
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
    <div className="group rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 text-lg group-hover:bg-emerald-50">
        {icon}
      </div>
      <p className="text-3xl font-bold tracking-tight text-heading-primary">{value}</p>
      <p className="mt-1 text-sm font-medium text-body">{label}</p>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [accessState, setAccessState] = useState<AdminAccessState>("loading");
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(false);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [wizardForm, setWizardForm] = useState<AdminPropertyFormState>(() => createEmptyAdminPropertyForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [bulkCsv, setBulkCsv] = useState("");
  const [bulkResult, setBulkResult] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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
    { key: "chats", label: "AI Chats", icon: "🤖", count: conversations.length },
    { key: "analytics", label: "Analytics", icon: "📈" },
    { key: "add", label: editId ? "Edit Property" : "Property Studio", icon: "✨" },
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
    return matchesSearch && matchesStatus;
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
    setTab("add");
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
      const { error } = await supabase.from("properties").insert({
        seller_id: adminUserId,
        title: row.title,
        type: row.type || "buy",
        sub_type: row.sub_type || "flat",
        price: parseFloat(row.price) || 0,
        area_sqft: parseFloat(row.area_sqft) || null,
        bedrooms: parseInt(row.bedrooms, 10) || null,
        bathrooms: parseInt(row.bathrooms, 10) || null,
        city: row.city,
        location: row.location || row.city,
        contact_name: row.contact_name || "",
        contact_phone: row.contact_phone || "",
        description: row.description || "",
        photos: [],
        amenities: [],
        status: "active",
      });
      results.push(
        error ? `Row ${i} (${row.title}): ERROR — ${error.message}` : `Row ${i} (${row.title}): ✅ Added`,
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
            <Logo size="dashboard" suffix="Admin" href={null} />
            <p className="mt-4 text-sm text-muted">
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
      onTabChange={(next) => {
        if (next === "leads") {
          router.push("/admin/leads");
          return;
        }
        setTab(next);
        setSearchQ("");
        setUserRoleFilter("all");
        setStatusFilter("all");
      }}
      navItems={navItems}
      onLogout={logoutAdmin}
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
          <h1 className="mb-6 text-2xl font-bold tracking-tight text-heading-primary">Dashboard Overview</h1>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard icon="🏠" label="Total Properties" value={stats.totalProperties} />
            <StatCard icon="⏳" label="Pending Properties" value={stats.pendingProperties} />
            <StatCard icon="✅" label="Approved Properties" value={stats.approvedProperties} />
            <StatCard icon="🛒" label="Buyers" value={stats.buyers} />
            <StatCard icon="🏷️" label="Sellers" value={stats.sellers} />
            <StatCard icon="🏗️" label="Builders" value={stats.builders} />
            <StatCard icon="📅" label="Site Visits" value={stats.siteVisits} />
            <StatCard icon="🤖" label="AI Chats" value={stats.aiChats} />
            <StatCard icon="📩" label="Leads" value={stats.leads} />
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
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
              <h2 className="mb-4 font-semibold text-heading-primary">Recent AI Chats</h2>
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
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-heading-primary">Property Command Center</h1>
            <button
              type="button"
              onClick={() => {
                resetWizard();
                setTab("add");
              }}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: EMERALD }}
            >
              + Add Property
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
              <option value="draft">Draft</option>
              <option value="paused">Paused</option>
              <option value="sold">Sold</option>
            </select>
          </div>
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50">
                  <tr>
                    {["Property", "Type", "Price", "City", "Seller", "Connect Partner", "Status", "Date", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-label">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProperties.map((prop) => (
                    <tr key={prop.id} className="border-b border-neutral-100 hover:bg-neutral-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-heading-primary">{prop.title}</p>
                        <p className="text-xs text-muted">{prop.sub_type}</p>
                      </td>
                      <td className="px-4 py-3 capitalize text-body">{prop.type}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">{formatPrice(prop.price)}</td>
                      <td className="px-4 py-3 text-body">{prop.city}</td>
                      <td className="px-4 py-3">
                        <AdminPropertySellerInline property={prop} lookup={profileLookup} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {prop.connect_partner?.company_name ? (
                            <p className="text-xs font-medium text-emerald-700">
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
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusBadgeClass(prop.status)}`}>
                          {prop.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">{formatDate(prop.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Link href={`/admin/properties/${prop.id}`} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">CMS</Link>
                          <button type="button" onClick={() => startEdit(prop)} className="rounded-lg border border-neutral-200 px-2 py-1 text-xs font-medium hover:bg-neutral-50">Edit</button>
                          <button type="button" onClick={async () => { await updatePropertyStatus(prop.id, prop.status === "active" ? "paused" : "active"); await loadAll(); }} className="rounded-lg border border-neutral-200 px-2 py-1 text-xs font-medium hover:bg-neutral-50">{prop.status === "active" ? "Pause" : "Activate"}</button>
                          <button type="button" onClick={async () => { if (confirm("Delete this property?")) { await deleteProperty(prop.id); await loadAll(); } }} className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
              The <code className="font-mono">approval_status</code> column is not in your database. Showing properties with status <strong>draft</strong> as pending. Approve sets status to <strong>active</strong>; reject sets <strong>paused</strong>.
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
                      {prop.city} · {formatPrice(prop.price)}
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
                      <button type="button" onClick={async () => { await approveProperty(prop.id); await loadAll(); }} className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white">Approve</button>
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
            <table className="min-w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  {["User", "Phone", "Email", "Role", "Joined", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-label">{h}</th>
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
      ) : null}

      {tab === "builders" ? <AdminConnectPanel /> : null}

      {tab === "crm" ? <AdminCrmPanel profileLookup={profileLookup} /> : null}

      {tab === "visits" ? (
        <div>
          <h1 className="mb-6 text-2xl font-bold text-heading-primary">Site Visits</h1>
          {!data?.hasSiteVisitsTable ? (
            <AdminEmptyState icon="📅" title="Site visits table not available" description="The site_visits table is not present in your Supabase schema. Visits will appear here once the table is created." />
          ) : siteVisits.length === 0 ? (
            <AdminEmptyState icon="📅" title="No site visits yet" description="Booked property visits will appear here." />
          ) : (
            <div className="space-y-4">
              {siteVisits.map((v) => (
                <article key={v.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                  <div className="border-b border-neutral-100 px-5 py-4">
                    <p className="font-semibold text-heading-primary">{v.property?.title ?? "—"}</p>
                    <p className="mt-1 text-sm text-muted">
                      {v.visit_date} at {v.visit_time?.slice?.(0, 5) ?? v.visit_time}
                    </p>
                  </div>
                  <div className="space-y-4 px-5 py-4">
                    <AdminProfileCard
                      profile={{ ...(v.buyer ?? {}), role: "buyer" }}
                      profileId={v.user_id}
                      lookup={profileLookup}
                      status={v.status}
                      statusClassName={statusBadgeClass(v.status)}
                      subtitle={`Site visit · ${v.property?.city ?? "—"}`}
                    />
                    <BuyerProfileGrid buyer={v.buyer} variant="compact" />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === "chats" ? (
        <div>
          <h1 className="mb-6 text-2xl font-bold text-heading-primary">AI Chats</h1>
          {!data?.hasConversationsTable ? (
            <AdminEmptyState icon="🤖" title="Conversations table not available" description="The conversations table is not accessible. AI chat history will appear here when available." />
          ) : conversations.length === 0 ? (
            <AdminEmptyState icon="🤖" title="No AI conversations yet" description="User AI assistant conversations will appear here." />
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
                <li>• Approval workflow: {usesApprovalStatus ? "using approval_status column" : "using status field fallback (draft → pending)"}</li>
                <li>• Site visits: {data?.hasSiteVisitsTable ? "connected" : "table not found"}</li>
                <li>• AI chats: {data?.hasConversationsTable ? "connected" : "table not accessible"}</li>
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "add" && adminUserId ? (
        <PropertyWizard
          key={editId ?? "new"}
          adminUserId={adminUserId}
          editId={editId}
          initialForm={wizardForm}
          onSaved={async () => {
            resetWizard();
            await loadAll();
            setTab("properties");
          }}
          onCancel={() => {
            resetWizard();
            setTab("properties");
          }}
        />
      ) : null}

      {tab === "bulk" ? (
        <div>
          <h1 className="mb-2 text-2xl font-bold text-heading-primary">Bulk Import</h1>
          <p className="mb-6 text-sm text-muted">Import multiple properties using CSV format.</p>
          <div className="max-w-3xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium">Upload CSV</button>
              <button type="button" onClick={() => setBulkCsv(BULK_TEMPLATE)} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">Load Example</button>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.txt" hidden onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => setBulkCsv(ev.target?.result as string); r.readAsText(f); }} />
            <textarea value={bulkCsv} onChange={(e) => setBulkCsv(e.target.value)} className="h-48 w-full rounded-xl border border-neutral-200 p-3 font-mono text-xs" placeholder="Paste CSV..." />
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
