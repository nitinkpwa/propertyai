"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DashboardHome from "./components/DashboardHome";
import MyPropertiesTab from "./components/MyPropertiesTab";
import PropertyFormTab from "./components/PropertyFormTab";
import LeadsTab from "./components/LeadsTab";
import VisitsTab from "./components/VisitsTab";
import AnalyticsTab from "./components/AnalyticsTab";
import NotificationsTab from "./components/NotificationsTab";
import ProfileTab from "./components/ProfileTab";
import SellerShell from "./components/SellerShell";
import { emptyForm } from "@/lib/seller/constants";
import {
  duplicateProperty,
  fetchSellerAnalytics,
  fetchSellerDashboardStats,
  fetchSellerLeads,
  fetchSellerNotifications,
  fetchSellerProfile,
  fetchSellerProperties,
  fetchSellerSiteVisits,
  formToPayload,
  rescheduleVisit,
  saveSellerProperty,
  softDeleteProperty,
  updateLeadStatus,
  updatePropertyStatus,
  updateSellerProfile,
  updateVisitStatus,
  uploadPropertyPhotos,
  uploadSellerAsset,
} from "@/lib/seller/queries";
import type {
  LeadStatus,
  PropertyFormState,
  SellerAnalytics,
  SellerDashboardStats,
  SellerLeadRow,
  SellerNotification,
  SellerProfile,
  SellerPropertyRow,
  SellerTab,
  SellerVisitRow,
  VisitStatus,
} from "@/lib/seller/types";

const TAB_TITLES: Record<SellerTab, string> = {
  home: "Dashboard",
  listings: "My Properties",
  add: "Add Property",
  leads: "Leads",
  visits: "Site Visits",
  analytics: "Analytics",
  notifications: "Notifications",
  profile: "Profile",
};

export default function SellerDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<SellerTab>("home");
  const [user, setUser] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<SellerDashboardStats>({
    totalProperties: 0,
    activeListings: 0,
    draftListings: 0,
    soldListings: 0,
    totalViews: 0,
    savedByBuyers: 0,
    leadsReceived: 0,
    siteVisits: 0,
  });
  const [listings, setListings] = useState<SellerPropertyRow[]>([]);
  const [leads, setLeads] = useState<SellerLeadRow[]>([]);
  const [visits, setVisits] = useState<SellerVisitRow[]>([]);
  const [analytics, setAnalytics] = useState<SellerAnalytics>({
    totalViews: 0,
    totalFavorites: 0,
    totalLeads: 0,
    totalVisits: 0,
    mostViewedProperty: null,
    mostSavedProperty: null,
    monthlyViews: [],
    hasData: false,
  });
  const [notifications, setNotifications] = useState<SellerNotification[]>([]);

  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PropertyFormState>({ ...emptyForm });
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const loadAll = useCallback(async (userId: string) => {
    const [
      profile,
      statsData,
      props,
      leadsData,
      visitsData,
      analyticsData,
      notifData,
    ] = await Promise.all([
      fetchSellerProfile(userId),
      fetchSellerDashboardStats(userId),
      fetchSellerProperties(userId),
      fetchSellerLeads(userId),
      fetchSellerSiteVisits(userId),
      fetchSellerAnalytics(userId),
      fetchSellerNotifications(userId),
    ]);

    if (profile) setUser(profile);
    setStats(statsData);
    setListings(props);
    setLeads(leadsData);
    setVisits(visitsData);
    setAnalytics(analyticsData);
    setNotifications(notifData);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/login?redirect=/seller");
        return;
      }
      await loadAll(authUser.id);
      setLoading(false);
    })();
  }, [router, loadAll]);

  const refresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await loadAll(user.id);
    setRefreshing(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setPhotos((prev) => [...prev, ...files].slice(0, 6));
    setPhotoUrls((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))].slice(0, 6));
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
    setExistingPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (asDraft: boolean) => {
    if (!user) return;
    if (!form.title || !form.price || !form.location) {
      setSaveMsg("Please fill property name, price and location");
      return;
    }
    if (!editId && listings.filter((l) => l.status !== "draft").length >= 10 && !asDraft) {
      setSaveMsg("Free plan allows max 10 active listings");
      return;
    }

    setSaving(true);
    setSaveMsg("");
    setUploadingPhotos(true);
    const uploaded = await uploadPropertyPhotos(user.id, photos);
    setUploadingPhotos(false);

    const keptExisting = existingPhotos.filter((url) => photoUrls.includes(url));
    const allPhotos = [...keptExisting, ...uploaded].slice(0, 6);

    const payload = formToPayload(form, user, allPhotos, asDraft ? "draft" : "active");
    const result = await saveSellerProperty(user.id, payload, editId);

    if (!result.ok) {
      setSaveMsg(`Error: ${result.error}`);
    } else {
      setSaveMsg(asDraft ? "✅ Saved as draft" : editId ? "✅ Property updated!" : "✅ Property published!");
      setForm({ ...emptyForm });
      setPhotos([]);
      setPhotoUrls([]);
      setExistingPhotos([]);
      setEditId(null);
      await refresh();
      setTab("listings");
    }
    setSaving(false);
  };

  const startEdit = (prop: SellerPropertyRow) => {
    setEditId(prop.id);
    setExistingPhotos(prop.photos ?? []);
    setForm({
      title: prop.title ?? "",
      description: prop.description ?? "",
      type: prop.type,
      sub_type: prop.sub_type,
      price: prop.price?.toString() ?? "",
      area_sqft: prop.area_sqft?.toString() ?? "",
      bedrooms: prop.bedrooms?.toString() ?? "",
      bathrooms: prop.bathrooms?.toString() ?? "",
      location: prop.location ?? "",
      city: prop.city ?? "Mohali",
      sector: prop.sector ?? "",
      builder_name: prop.builder_name ?? "",
      furnishing: prop.furnishing ?? "",
      parking: prop.parking ?? "",
      facing: prop.facing ?? "",
      amenities: (prop.amenities ?? []).join(", "),
      nearby_places: Array.isArray(prop.nearby_places)
        ? prop.nearby_places.join(", ")
        : "",
      lat: prop.lat?.toString() ?? "",
      lng: prop.lng?.toString() ?? "",
      rera_number: prop.rera_number ?? "",
      possession: prop.possession ?? "",
      featured_image: prop.featured_image ?? "",
      contact_name: prop.contact_name ?? "",
      contact_phone: prop.contact_phone ?? "",
    });
    setPhotoUrls(prop.photos ?? []);
    setPhotos([]);
    setSaveMsg("");
    setTab("add");
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setPhotos([]);
    setPhotoUrls([]);
    setExistingPhotos([]);
    setSaveMsg("");
    setTab("listings");
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm("Delete this listing? It will be removed from public view.")) return;
    await softDeleteProperty(id, user.id);
    await refresh();
  };

  const handleTogglePause = async (id: string, status: string) => {
    if (!user) return;
    const next = status === "active" ? "paused" : "active";
    await updatePropertyStatus(id, user.id, next);
    await refresh();
  };

  const handleMarkSold = async (id: string) => {
    if (!user || !confirm("Mark this property as sold?")) return;
    await updatePropertyStatus(id, user.id, "sold");
    await refresh();
  };

  const handleDuplicate = async (id: string) => {
    if (!user) return;
    await duplicateProperty(id, user.id);
    await refresh();
  };

  const handleLeadStatus = async (id: string, status: LeadStatus) => {
    if (!user) return;
    await updateLeadStatus(id, user.id, status);
    await refresh();
  };

  const handleVisitStatus = async (id: string, status: VisitStatus) => {
    if (!user) return;
    await updateVisitStatus(id, user.id, status);
    await refresh();
  };

  const handleReschedule = async (id: string, date: string, time: string) => {
    if (!user) return;
    await rescheduleVisit(id, user.id, date, time);
    await refresh();
  };

  const handleAddProperty = () => {
    cancelEdit();
    setTab("add");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] font-sans text-neutral-600">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  const newLeads = leads.filter((l) => l.status === "new").length;

  return (
    <SellerShell
      tab={tab}
      onTabChange={setTab}
      userName={user?.full_name}
      avatarUrl={user?.avatar_url}
      newLeads={newLeads}
      unreadNotifications={notifications.length}
      refreshing={refreshing}
      onLogout={handleLogout}
      onAddProperty={handleAddProperty}
    >
      {tab !== "home" ? (
        <div className="mb-6 transition-opacity duration-300">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
            {TAB_TITLES[tab]}
          </h2>
          {tab === "listings" ? (
            <p className="mt-1 text-sm text-neutral-500">
              {stats.activeListings} active · {stats.totalProperties} total properties
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="transition-opacity duration-300">
        {tab === "home" ? <DashboardHome stats={stats} /> : null}
        {tab === "listings" ? (
          <MyPropertiesTab
            listings={listings}
            onEdit={startEdit}
            onDelete={handleDelete}
            onTogglePause={handleTogglePause}
            onMarkSold={handleMarkSold}
            onDuplicate={handleDuplicate}
            onCreateListing={handleAddProperty}
          />
        ) : null}
        {tab === "add" ? (
          <PropertyFormTab
            form={form}
            setForm={setForm}
            photoUrls={photoUrls}
            onPhotoChange={handlePhotoChange}
            onRemovePhoto={removePhoto}
            editId={editId}
            saving={saving}
            uploadingPhotos={uploadingPhotos}
            saveMsg={saveMsg}
            onSave={handleSave}
            onCancel={cancelEdit}
          />
        ) : null}
        {tab === "leads" ? <LeadsTab leads={leads} onUpdateStatus={handleLeadStatus} /> : null}
        {tab === "visits" ? (
          <VisitsTab visits={visits} onUpdateStatus={handleVisitStatus} onReschedule={handleReschedule} />
        ) : null}
        {tab === "analytics" ? <AnalyticsTab analytics={analytics} /> : null}
        {tab === "notifications" ? <NotificationsTab notifications={notifications} /> : null}
        {tab === "profile" && user ? (
          <ProfileTab
            profile={user}
            onSave={async (data) => {
              const ok = await updateSellerProfile(user.id, data);
              if (ok) await refresh();
              return ok;
            }}
            onUploadLogo={async (file) => {
              const url = await uploadSellerAsset(user.id, file, "logo");
              if (url) {
                await updateSellerProfile(user.id, { logo_url: url });
                await refresh();
              }
              return url;
            }}
            onUploadAvatar={async (file) => {
              const url = await uploadSellerAsset(user.id, file, "avatar");
              if (url) {
                await updateSellerProfile(user.id, { avatar_url: url });
                await refresh();
              }
              return url;
            }}
          />
        ) : null}
      </div>
    </SellerShell>
  );
}
