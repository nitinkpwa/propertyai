"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";
import AdminEmptyState from "./components/AdminEmptyState";
import AdminShell, { type AdminNavItem } from "./components/AdminShell";
import AdminCrmPanel from "@/components/crm/AdminCrmPanel";
import BuyerProfileGrid from "@/components/crm/BuyerProfileGrid";
import Logo from "@/components/common/Logo";
import {
  isAdminSessionActive,
  setAdminSession,
  verifyAdminCredentials,
} from "@/lib/admin/auth";
import {
  ADMIN_CITIES,
  ADMIN_SUB_TYPES,
  ADMIN_TYPES,
  BULK_TEMPLATE,
  EMERALD,
  formatDate,
  formatDateTime,
  formatPrice,
  inp,
  lbl,
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
import type {
  AdminConversationRow,
  AdminData,
  AdminPropertyRow,
  AdminTab,
} from "@/lib/admin/types";
import { supabase } from "@/lib/supabase";

type AdminAccessState = "loading" | "signed_out" | "ready";

const emptyForm = {
  title: "",
  type: "buy",
  sub_type: "flat",
  price: "",
  area_sqft: "",
  bedrooms: "",
  bathrooms: "",
  city: "Mohali",
  location: "",
  sector: "",
  contact_name: "",
  contact_phone: "",
  description: "",
  amenities: "",
};

function statusBadgeClass(status: string): string {
  if (status === "active" || status === "approved") return "bg-emerald-50 text-emerald-700";
  if (status === "draft" || status === "pending") return "bg-amber-50 text-amber-700";
  if (status === "paused" || status === "rejected") return "bg-red-50 text-red-700";
  return "bg-neutral-100 text-neutral-600";
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
      <p className="text-3xl font-bold tracking-tight text-neutral-900">{value}</p>
      <p className="mt-1 text-sm font-medium text-neutral-600">{label}</p>
    </div>
  );
}

export default function AdminPage() {
  const [accessState, setAccessState] = useState<AdminAccessState>("loading");
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [bulkCsv, setBulkCsv] = useState("");
  const [bulkResult, setBulkResult] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [selectedChat, setSelectedChat] = useState<AdminConversationRow | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    /*
    TODO(production): Replace sessionStorage admin gate with Supabase role verification:
    async function verifyAdminAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAccessState("signed_out"); return; }
      const profile = await fetchProfile(user.id);
      if (!isAdminRole(profile?.role)) { setAccessState("forbidden"); return; }
      setAdminUserId(user.id);
      setAccessState("ready");
    }
    verifyAdminAccess();
    */

    if (isAdminSessionActive()) {
      setAccessState("ready");
    } else {
      setAccessState("signed_out");
    }
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) setAdminUserId(user.id);
    const adminData = await fetchAdminData();
    setData(adminData);
    setLoading(false);
  };

  useEffect(() => {
    if (accessState === "ready") loadAll();
  }, [accessState]);

  const logoutAdmin = () => {
    setAdminSession(false);
    setAccessState("signed_out");
    setAdminUsername("");
    setAdminPassword("");
    setLoginError("");
  };

  const handleAdminLogin = (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError("");

    if (verifyAdminCredentials(adminUsername, adminPassword)) {
      setAdminSession(true);
      setAccessState("ready");
      setAdminPassword("");
      return;
    }

    setLoginError("Invalid credentials.");
  };

  const properties = data?.properties ?? [];
  const profiles = data?.profiles ?? [];
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
    { key: "users", label: "Users", icon: "👤", count: profiles.length },
    { key: "builders", label: "AreaIQ Connect", icon: "🏗️", count: builders.length },
    { key: "leads", label: "Leads", icon: "📩", count: leads.length },
    { key: "crm", label: "CRM", icon: "🔗" },
    { key: "visits", label: "Site Visits", icon: "📅", count: siteVisits.length },
    { key: "chats", label: "AI Chats", icon: "🤖", count: conversations.length },
    { key: "analytics", label: "Analytics", icon: "📈" },
    { key: "add", label: editId ? "Edit Property" : "Add Property", icon: "➕" },
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

  const handleSave = async () => {
    if (!form.title || !form.price || !form.location) {
      setSaveMsg("Fill title, price and location");
      return;
    }
    if (!adminUserId) {
      setSaveMsg("Please sign in to Supabase first to add listings");
      return;
    }
    setSaving(true);
    setSaveMsg("");
    const payload = {
      title: form.title,
      type: form.type,
      sub_type: form.sub_type,
      price: parseFloat(form.price),
      area_sqft: parseFloat(form.area_sqft) || null,
      bedrooms: parseInt(form.bedrooms, 10) || null,
      bathrooms: parseInt(form.bathrooms, 10) || null,
      city: form.city,
      location: form.location,
      sector: form.sector,
      contact_name: form.contact_name,
      contact_phone: form.contact_phone,
      description: form.description,
      amenities: form.amenities
        ? form.amenities.split(",").map((a) => a.trim()).filter(Boolean)
        : [],
      photos: [],
      status: "active",
      seller_id: adminUserId,
      updated_at: new Date().toISOString(),
    };

    const { error } = editId
      ? await supabase.from("properties").update(payload).eq("id", editId)
      : await supabase.from("properties").insert(payload);

    if (error) setSaveMsg(`Error: ${error.message}`);
    else {
      setSaveMsg(editId ? "✅ Updated!" : "✅ Published!");
      setForm({ ...emptyForm });
      setEditId(null);
      await loadAll();
      setTab("properties");
    }
    setSaving(false);
  };

  const startEdit = (p: AdminPropertyRow) => {
    setEditId(p.id);
    setForm({
      title: p.title || "",
      type: p.type || "buy",
      sub_type: p.sub_type || "flat",
      price: p.price?.toString() || "",
      area_sqft: p.area_sqft?.toString() || "",
      bedrooms: p.bedrooms?.toString() || "",
      bathrooms: p.bathrooms?.toString() || "",
      city: p.city || "Mohali",
      location: p.location || "",
      sector: p.sector || "",
      contact_name: p.contact_name || "",
      contact_phone: p.contact_phone || "",
      description: p.description || "",
      amenities: (p.amenities || []).join(", "),
    });
    setTab("add");
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
            <p className="mt-4 text-sm text-neutral-500">
              Sign in with your admin credentials
            </p>
          </div>

          {loginError ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {loginError}
            </div>
          ) : null}

          <form onSubmit={handleAdminLogin} className="space-y-1">
            <AuthInput
              label="Admin Username"
              autoComplete="username"
              placeholder="Enter admin username"
              value={adminUsername}
              onChange={(event) => setAdminUsername(event.target.value)}
            />
            <AuthInput
              label="Admin Password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter admin password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
            />
            <div className="pt-2">
              <AuthButton type="submit">Access Admin</AuthButton>
            </div>
          </form>

          <a
            href="/"
            className="mt-4 block text-center text-sm text-neutral-500 no-underline hover:text-neutral-800"
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
      className="w-full max-w-xs rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
    />
  );

  return (
    <AdminShell tab={tab} onTabChange={setTab} navItems={navItems} onLogout={logoutAdmin}>
      {loading && !data ? (
        <div className="flex justify-center py-20">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
        </div>
      ) : null}

      {tab === "dashboard" && stats ? (
        <div>
          <h1 className="mb-6 text-2xl font-bold tracking-tight text-neutral-900">Dashboard Overview</h1>
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
              <h2 className="mb-4 font-semibold text-neutral-900">Latest Leads</h2>
              {leads.slice(0, 5).map((l) => (
                <div key={l.id} className="flex items-center justify-between border-b border-neutral-100 py-3 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{l.buyer?.full_name ?? "Buyer"}</p>
                    <p className="text-xs text-neutral-500">{l.property?.title ?? "—"}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(l.status)}`}>
                    {l.status}
                  </span>
                </div>
              ))}
              {leads.length === 0 ? <p className="text-sm text-neutral-500">No leads yet</p> : null}
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-neutral-900">Recent AI Chats</h2>
              {conversations.slice(0, 5).map((c) => (
                <div key={c.id} className="border-b border-neutral-100 py-3 last:border-0">
                  <p className="text-sm font-medium text-neutral-900">{c.user?.full_name ?? c.user?.email ?? "User"}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{getChatSummary(c.messages)}</p>
                </div>
              ))}
              {conversations.length === 0 ? (
                <p className="text-sm text-neutral-500">No AI conversations yet</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "properties" ? (
        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-neutral-900">Properties Management</h1>
            <button
              type="button"
              onClick={() => {
                setEditId(null);
                setForm({ ...emptyForm });
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
                    {["Property", "Type", "Price", "City", "Contact", "Status", "Date", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProperties.map((prop) => (
                    <tr key={prop.id} className="border-b border-neutral-100 hover:bg-neutral-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-neutral-900">{prop.title}</p>
                        <p className="text-xs text-neutral-500">{prop.sub_type}</p>
                      </td>
                      <td className="px-4 py-3 capitalize text-neutral-600">{prop.type}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">{formatPrice(prop.price)}</td>
                      <td className="px-4 py-3 text-neutral-600">{prop.city}</td>
                      <td className="px-4 py-3">
                        <p className="text-neutral-900">{prop.contact_name}</p>
                        <p className="text-xs text-neutral-500">{prop.contact_phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusBadgeClass(prop.status)}`}>
                          {prop.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500">{formatDate(prop.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
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
              <p className="py-12 text-center text-sm text-neutral-500">No properties found</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "pending" ? (
        <div>
          <h1 className="mb-2 text-2xl font-bold text-neutral-900">Pending Approval</h1>
          {!usesApprovalStatus ? (
            <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              The <code className="font-mono">approval_status</code> column is not in your database. Showing properties with status <strong>draft</strong> as pending. Approve sets status to <strong>active</strong>; reject sets <strong>paused</strong>.
            </p>
          ) : null}
          {pendingProperties.length === 0 ? (
            <AdminEmptyState icon="⏳" title="No pending properties" description="Properties awaiting approval will appear here." />
          ) : (
            <div className="space-y-3">
              {pendingProperties.map((prop) => (
                <div key={prop.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                  <div>
                    <p className="font-semibold text-neutral-900">{prop.title}</p>
                    <p className="text-sm text-neutral-500">{prop.city} · {formatPrice(prop.price)} · {prop.seller?.full_name ?? "Seller"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={async () => { await approveProperty(prop.id); await loadAll(); }} className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white">Approve</button>
                    <button type="button" onClick={async () => { await rejectProperty(prop.id); await loadAll(); }} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600">Reject</button>
                    <button type="button" onClick={() => startEdit(prop)} className="rounded-xl border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700">Edit</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === "users" ? (
        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-neutral-900">Users</h1>
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
                  {["Name", "Phone", "Role", "Joined", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((p) => (
                  <tr key={p.id} className="border-b border-neutral-100">
                    <td className="px-4 py-3 font-medium text-neutral-900">{p.full_name || "—"}</td>
                    <td className="px-4 py-3 text-neutral-600">{p.phone || "—"}</td>
                    <td className="px-4 py-3 capitalize text-neutral-600">{p.role}</td>
                    <td className="px-4 py-3 text-neutral-500">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Active</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 ? <p className="py-12 text-center text-sm text-neutral-500">No users found</p> : null}
          </div>
        </div>
      ) : null}

      {tab === "builders" ? (
        <div>
          <h1 className="mb-6 text-2xl font-bold text-neutral-900">AreaIQ Connect — Builders</h1>
          {builders.length === 0 ? (
            <AdminEmptyState icon="🏗️" title="No registered builders" description="Builders who register via AreaIQ Connect will appear here." />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50">
                  <tr>
                    {["Company", "Projects", "Listings", "Phone", "Manager", "Status"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {builders.map((b) => (
                    <tr key={b.id} className="border-b border-neutral-100">
                      <td className="px-4 py-3 font-medium text-neutral-900">{b.company || b.full_name || "—"}</td>
                      <td className="px-4 py-3 text-neutral-600">{b.project_count}</td>
                      <td className="px-4 py-3 text-neutral-600">{b.listing_count}</td>
                      <td className="px-4 py-3 text-neutral-600">{b.phone || "—"}</td>
                      <td className="px-4 py-3 text-neutral-600">{b.full_name || "—"}</td>
                      <td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Registered</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {tab === "leads" ? (
        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-neutral-900">Leads</h1>
            {searchInput}
          </div>
          <div className="space-y-4">
            {leads.filter((l) => {
              const q = searchQ.toLowerCase();
              return !q || l.buyer?.full_name?.toLowerCase().includes(q) || l.property?.title?.toLowerCase().includes(q);
            }).map((lead) => (
              <article key={lead.crmLeadId ?? lead.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                <div className="border-b border-neutral-100 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-neutral-900">{lead.buyer?.full_name ?? "Buyer"}</p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {lead.property?.title ?? "—"} · {lead.leadSource ?? "Inquiry"}
                      </p>
                    </div>
                    <div className="text-right text-xs text-neutral-500">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(lead.crmStatus ?? lead.status)}`}>{lead.crmStatus ?? lead.status}</span>
                      <p className="mt-2">{formatDateTime(lead.created_at)}</p>
                      {lead.assignedConnect ? <p className="mt-1">Connect: {lead.assignedConnect}</p> : null}
                    </div>
                  </div>
                </div>
                <div className="px-5 py-4">
                  <BuyerProfileGrid buyer={lead.buyer} />
                </div>
              </article>
            ))}
          </div>
          {leads.length === 0 ? <p className="py-12 text-center text-sm text-neutral-500">No enquiries yet</p> : null}
        </div>
      ) : null}

      {tab === "crm" ? <AdminCrmPanel /> : null}

      {tab === "visits" ? (
        <div>
          <h1 className="mb-6 text-2xl font-bold text-neutral-900">Site Visits</h1>
          {!data?.hasSiteVisitsTable ? (
            <AdminEmptyState icon="📅" title="Site visits table not available" description="The site_visits table is not present in your Supabase schema. Visits will appear here once the table is created." />
          ) : siteVisits.length === 0 ? (
            <AdminEmptyState icon="📅" title="No site visits yet" description="Booked property visits will appear here." />
          ) : (
            <div className="space-y-4">
              {siteVisits.map((v) => (
                <article key={v.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                  <div className="border-b border-neutral-100 px-5 py-4">
                    <p className="font-semibold text-neutral-900">{v.property?.title ?? "Property"}</p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {v.visit_date} at {v.visit_time?.slice?.(0, 5) ?? v.visit_time} · <span className="capitalize">{v.status.replace(/_/g, " ")}</span>
                    </p>
                  </div>
                  <div className="px-5 py-4">
                    <BuyerProfileGrid buyer={v.buyer} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === "chats" ? (
        <div>
          <h1 className="mb-6 text-2xl font-bold text-neutral-900">AI Chats</h1>
          {!data?.hasConversationsTable ? (
            <AdminEmptyState icon="🤖" title="Conversations table not available" description="The conversations table is not accessible. AI chat history will appear here when available." />
          ) : conversations.length === 0 ? (
            <AdminEmptyState icon="🤖" title="No AI conversations yet" description="User AI assistant conversations will appear here." />
          ) : (
            <div className={`grid gap-4 ${selectedChat ? "lg:grid-cols-2" : ""}`}>
              <div className="space-y-2">
                {conversations.filter((c) => {
                  const q = searchQ.toLowerCase();
                  return !q || c.user?.full_name?.toLowerCase().includes(q) || c.user?.email?.toLowerCase().includes(q);
                }).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedChat(selectedChat?.id === c.id ? null : c)}
                    className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition-all ${selectedChat?.id === c.id ? "border-emerald-300 ring-1 ring-emerald-200" : "border-neutral-200 hover:shadow-md"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-neutral-900">{c.user?.full_name ?? c.user?.email ?? "User"}</p>
                        <p className="mt-1 text-xs text-neutral-500">{getInterest(c.messages)} · {formatDateTime(c.created_at)}</p>
                      </div>
                      <span className="text-xs text-neutral-400">{c.messages?.length ?? 0} msgs</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{getChatSummary(c.messages)}</p>
                  </button>
                ))}
              </div>
              {selectedChat ? (
                <div className="sticky top-24 max-h-[70vh] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                  <div className="border-b border-neutral-100 px-4 py-3">
                    <p className="font-semibold text-neutral-900">{selectedChat.user?.full_name ?? "Chat"}</p>
                  </div>
                  <div className="max-h-[60vh] space-y-3 overflow-y-auto p-4">
                    {(selectedChat.messages ?? []).map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${msg.role === "user" ? "bg-emerald-500 text-white" : "bg-neutral-100 text-neutral-900"}`}>
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
          <h1 className="mb-6 text-2xl font-bold text-neutral-900">Analytics</h1>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-neutral-900">Properties by Status</h2>
              {analytics.propertiesByStatus.map((row) => (
                <div key={row.status} className="mb-2 flex items-center gap-3">
                  <span className="w-24 capitalize text-sm text-neutral-600">{row.status}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, (row.count / Math.max(stats?.totalProperties ?? 1, 1)) * 100)}%` }} />
                  </div>
                  <span className="w-8 text-right text-sm font-semibold text-neutral-900">{row.count}</span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-neutral-900">Leads by Status</h2>
              {analytics.leadsByStatus.length === 0 ? <p className="text-sm text-neutral-500">No lead data</p> : null}
              {analytics.leadsByStatus.map((row) => (
                <div key={row.status} className="mb-2 flex justify-between border-b border-neutral-100 py-2 text-sm">
                  <span className="capitalize text-neutral-600">{row.status}</span>
                  <span className="font-semibold text-neutral-900">{row.count}</span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-neutral-900">Users by Role</h2>
              {analytics.usersByRole.map((row) => (
                <div key={row.role} className="mb-2 flex justify-between border-b border-neutral-100 py-2 text-sm">
                  <span className="capitalize text-neutral-600">{row.role}</span>
                  <span className="font-semibold text-neutral-900">{row.count}</span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-neutral-900">Properties by City</h2>
              {analytics.propertiesByCity.map((row) => (
                <div key={row.city} className="mb-2 flex justify-between border-b border-neutral-100 py-2 text-sm">
                  <span className="text-neutral-600">{row.city}</span>
                  <span className="font-semibold text-neutral-900">{row.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "settings" ? (
        <div>
          <h1 className="mb-6 text-2xl font-bold text-neutral-900">Settings</h1>
          <div className="space-y-4">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-neutral-900">Admin Access</h2>
              <p className="mt-2 text-sm text-neutral-500">MVP session gate. Sign out to require admin credentials again.</p>
              <button type="button" onClick={logoutAdmin} className="mt-4 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">Sign Out</button>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-neutral-900">Supabase Connection</h2>
              <p className="mt-2 text-sm text-neutral-500">Property CRUD, users, leads, and chats load from your live Supabase project.</p>
              <p className="mt-2 text-xs text-neutral-400">Admin user ID: {adminUserId ?? "Not signed in to Supabase"}</p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-neutral-900">Schema Notes</h2>
              <ul className="mt-3 space-y-2 text-sm text-neutral-600">
                <li>• Approval workflow: {usesApprovalStatus ? "using approval_status column" : "using status field fallback (draft → pending)"}</li>
                <li>• Site visits: {data?.hasSiteVisitsTable ? "connected" : "table not found"}</li>
                <li>• AI chats: {data?.hasConversationsTable ? "connected" : "table not accessible"}</li>
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "add" ? (
        <div>
          <h1 className="mb-6 text-2xl font-bold text-neutral-900">{editId ? "Edit Property" : "Add Property"}</h1>
          <div className="max-w-3xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            {saveMsg ? (
              <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${saveMsg.includes("✅") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{saveMsg}</div>
            ) : null}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><label style={lbl}>Property Title *</label><input style={inp} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><label style={lbl}>Listing Type</label><select style={inp} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{ADMIN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              <div><label style={lbl}>Sub Type</label><select style={inp} value={form.sub_type} onChange={(e) => setForm({ ...form, sub_type: e.target.value })}>{ADMIN_SUB_TYPES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</select></div>
              <div><label style={lbl}>Price (₹) *</label><input style={inp} type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
              <div><label style={lbl}>Area (sqft)</label><input style={inp} type="number" value={form.area_sqft} onChange={(e) => setForm({ ...form, area_sqft: e.target.value })} /></div>
              <div><label style={lbl}>Bedrooms</label><input style={inp} type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} /></div>
              <div><label style={lbl}>Bathrooms</label><input style={inp} type="number" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} /></div>
              <div><label style={lbl}>City</label><select style={inp} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>{ADMIN_CITIES.map((c) => <option key={c}>{c}</option>)}</select></div>
              <div><label style={lbl}>Sector</label><input style={inp} value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} /></div>
              <div className="sm:col-span-2"><label style={lbl}>Location *</label><input style={inp} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div className="sm:col-span-2"><label style={lbl}>Description</label><textarea style={{ ...inp, height: 80, resize: "vertical" }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><label style={lbl}>Contact Name</label><input style={inp} value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
              <div><label style={lbl}>Contact Phone</label><input style={inp} value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
              <div className="sm:col-span-2"><label style={lbl}>Amenities</label><input style={inp} value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} /></div>
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" disabled={saving} onClick={handleSave} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: EMERALD }}>{saving ? "Saving..." : editId ? "Save Changes" : "Publish Property"}</button>
              <button type="button" onClick={() => { setEditId(null); setForm({ ...emptyForm }); setTab("properties"); }} className="rounded-xl border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-700">Cancel</button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "bulk" ? (
        <div>
          <h1 className="mb-2 text-2xl font-bold text-neutral-900">Bulk Import</h1>
          <p className="mb-6 text-sm text-neutral-500">Import multiple properties using CSV format.</p>
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
