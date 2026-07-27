"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { manageSiteVisit } from "@/lib/crm/queries";
import { emptyForm } from "@/lib/seller/constants";
import {
  deleteSellerProperty,
  duplicateProperty,
  fetchSellerAnalytics,
  fetchSellerDashboardStats,
  fetchSellerLeads,
  fetchSellerNotifications,
  fetchSellerProfile,
  fetchSellerProperties,
  fetchSellerSiteVisits,
  formToPayload,
  propertyRowToFormState,
  saveSellerProperty,
  updateSellerProfile,
  uploadPropertyPhotos,
  uploadSellerAsset,
} from "@/lib/seller/queries";
import type {
  PropertyFormState,
  SellerAnalytics,
  SellerDashboardStats,
  SellerLeadRow,
  SellerNotification,
  SellerProfile,
  SellerPropertyRow,
  SellerTab,
  SellerVisitRow,
} from "@/lib/seller/types";
import { supabase } from "@/lib/supabase";
import SellerShell from "./components/SellerShell";
import SellerToast, { type SellerToastState } from "./components/SellerToast";

const DashboardHome = dynamic(() => import("./components/DashboardHome"));
const MyPropertiesTab = dynamic(() => import("./components/MyPropertiesTab"));
const PropertyFormTab = dynamic(() => import("./components/PropertyFormTab"));
const LeadsTab = dynamic(() => import("./components/LeadsTab"));
const VisitsTab = dynamic(() => import("./components/VisitsTab"));
const AnalyticsTab = dynamic(() => import("./components/AnalyticsTab"));
const NotificationsTab = dynamic(() => import("./components/NotificationsTab"));
const ProfileTab = dynamic(() => import("./components/ProfileTab"));

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

const SELLER_TABS = Object.keys(TAB_TITLES) as SellerTab[];

function parseSellerTab(value: string | null): SellerTab {
  if (value && SELLER_TABS.includes(value as SellerTab)) {
    return value as SellerTab;
  }
  return "home";
}

function SellerDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseSellerTab(searchParams.get("tab"));
  const [user, setUser] = useState<SellerProfile | null>(null);

  const handleTabChange = useCallback(
    (next: SellerTab) => {
      const href = next === "home" ? "/seller" : `/seller?tab=${next}`;
      router.replace(href, { scroll: false });
    },
    [router],
  );
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
  const [toast, setToast] = useState<SellerToastState>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editNearbyPlaces, setEditNearbyPlaces] = useState<unknown>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
  }, []);

  const loadAll = useCallback(async (userId: string) => {
    try {
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
      console.log("[loadAll] ok", {
        userId,
        listings: props.length,
        draftListings: statsData.draftListings,
      });
    } catch (err) {
      console.error("[loadAll] failed", err);
      setSaveMsg(
        `Error loading seller data: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }, []);

  useEffect(() => {
    let poll: number | undefined;
    let authUserId: string | null = null;
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/login?redirect=/seller");
        return;
      }
      authUserId = authUser.id;
      await loadAll(authUser.id);
      setLoading(false);
      poll = window.setInterval(() => {
        if (authUserId) void loadAll(authUserId);
      }, 20_000);
    })();
    return () => {
      if (poll) window.clearInterval(poll);
    };
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
    if (!user) {
      setSaveMsg("Error: You must be signed in to create a property.");
      showToast("error", "You must be signed in to create a property.");
      return;
    }
    if (!form.title || !form.price || !form.location) {
      setSaveMsg("Please fill property name, price and location");
      return;
    }

    setSaving(true);
    setSaveMsg("");

    setUploadingPhotos(true);
    let uploaded: string[] = [];
    try {
      uploaded = await uploadPropertyPhotos(user.id, photos);
    } catch (err) {
      setUploadingPhotos(false);
      setSaving(false);
      const msg = `Photo upload failed — ${err instanceof Error ? err.message : String(err)}`;
      setSaveMsg(`Error: ${msg}`);
      showToast("error", msg);
      return;
    }
    setUploadingPhotos(false);

    const keptExisting = existingPhotos.filter((url) => photoUrls.includes(url));
    const allPhotos = [...keptExisting, ...uploaded].slice(0, 6);

    const payload = formToPayload(form, user, allPhotos, {
      asDraft,
      existingNearbyPlaces: editNearbyPlaces,
    });

    let result: Awaited<ReturnType<typeof saveSellerProperty>>;
    try {
      result = await saveSellerProperty(user.id, payload, editId, { asDraft });
    } catch (err) {
      setSaving(false);
      const msg = `Save failed — ${err instanceof Error ? err.message : String(err)}`;
      setSaveMsg(`Error: ${msg}`);
      showToast("error", msg);
      return;
    }

    if (!result.ok || !result.propertyId) {
      const msg = result.error ?? "Property was not saved. No database id returned.";
      setSaveMsg(`Error: ${msg}`);
      showToast("error", msg);
      setSaving(false);
      return;
    }

    const successMsg = editId
      ? asDraft
        ? "Property updated and saved as Draft."
        : "Property updated and submitted for review."
      : asDraft
        ? "Draft saved."
        : "Submitted for review.";

    setSaveMsg(`✅ ${successMsg}`);
    showToast("success", successMsg);
    setForm({ ...emptyForm });
    setPhotos([]);
    setPhotoUrls([]);
    setExistingPhotos([]);
    setEditNearbyPlaces(null);
    setEditId(null);
    await refresh();
    handleTabChange("listings");
    setSaving(false);
  };

  const startEdit = (prop: SellerPropertyRow) => {
    setEditId(prop.id);
    setExistingPhotos(prop.photos ?? []);
    setEditNearbyPlaces(prop.nearby_places ?? null);
    setForm(propertyRowToFormState(prop));
    setPhotoUrls(prop.photos ?? []);
    setPhotos([]);
    setSaveMsg("");
    handleTabChange("add");
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setPhotos([]);
    setPhotoUrls([]);
    setExistingPhotos([]);
    setEditNearbyPlaces(null);
    setSaveMsg("");
    handleTabChange("listings");
  };

  const handleDelete = async (prop: SellerPropertyRow): Promise<boolean> => {
    if (!user) {
      showToast("error", "You must be signed in.");
      return false;
    }
    setBusyId(prop.id);
    const previous = listings;
    setListings((rows) => rows.filter((r) => r.id !== prop.id));

    const result = await deleteSellerProperty(prop.id, user.id);
    setBusyId(null);

    if (!result.ok) {
      setListings(previous);
      showToast("error", result.error ?? "Could not delete property.");
      return false;
    }

    showToast("success", "Property deleted.");
    await refresh();
    return true;
  };

  const handleDuplicate = async (prop: SellerPropertyRow) => {
    if (!user) {
      showToast("error", "You must be signed in.");
      return;
    }
    setBusyId(prop.id);
    const result = await duplicateProperty(prop.id, user.id);
    setBusyId(null);
    if (!result.ok) {
      showToast("error", result.error ?? "Could not duplicate property.");
      return;
    }
    showToast("success", "Draft copy created.");
    await refresh();
  };

  const handlePreview = (prop: SellerPropertyRow) => {
    window.open(`/property/${prop.id}`, "_blank", "noopener,noreferrer");
  };

  const handleVisitAccept = async (id: string) => {
    await manageSiteVisit(id, "accept");
    await refresh();
  };

  const handleVisitReject = async (id: string) => {
    await manageSiteVisit(id, "reject");
    await refresh();
  };

  const handleVisitReschedule = async (id: string, date: string, time: string) => {
    await manageSiteVisit(id, "reschedule", { visitDate: date, visitTime: time });
    await refresh();
  };

  const handleVisitComplete = async (id: string) => {
    await manageSiteVisit(id, "complete");
    await refresh();
  };

  const handleAddProperty = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setPhotos([]);
    setPhotoUrls([]);
    setExistingPhotos([]);
    setEditNearbyPlaces(null);
    setSaveMsg("");
    handleTabChange("add");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] font-sans text-body">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  const newLeads =
    leads.filter((l) => l.status === "new").length +
    visits.filter((v) => v.status === "pending_approval").length;

  return (
    <SellerShell
      tab={tab}
      onTabChange={handleTabChange}
      userName={user?.full_name}
      avatarUrl={user?.avatar_url}
      newLeads={newLeads}
      unreadNotifications={notifications.length}
      refreshing={refreshing}
      onLogout={handleLogout}
      onAddProperty={handleAddProperty}
    >
      <SellerToast toast={toast} onDismiss={() => setToast(null)} />
      {tab !== "home" ? (
        <div className="mb-6 transition-opacity duration-300">
          <h2 className="text-2xl font-bold tracking-tight text-heading-primary">
            {editId && tab === "add" ? "Edit Property" : TAB_TITLES[tab]}
          </h2>
          {tab === "listings" ? (
            <p className="mt-1 text-sm text-muted">
              {stats.activeListings} approved · {stats.draftListings} pending/draft ·{" "}
              {stats.totalProperties} total
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
            onDuplicate={handleDuplicate}
            onPreview={handlePreview}
            onCreateListing={handleAddProperty}
            busyId={busyId}
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
        {tab === "leads" && user ? (
          <LeadsTab sellerId={user.id} />
        ) : null}
        {tab === "visits" ? (
          <VisitsTab
            visits={visits}
            onAccept={handleVisitAccept}
            onReject={handleVisitReject}
            onReschedule={handleVisitReschedule}
            onComplete={handleVisitComplete}
          />
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

export default function SellerDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      }
    >
      <SellerDashboardInner />
    </Suspense>
  );
}
