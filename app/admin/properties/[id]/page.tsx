"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PropertyCmsEditor from "@/components/admin/property/PropertyCmsEditor";
import { isAdminRole } from "@/lib/auth/admin";
import { fetchProfile } from "@/lib/auth/profile";
import { supabase } from "@/lib/supabase/client";

export default function AdminPropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [adminDisplayName, setAdminDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void params.then((p) => setPropertyId(p.id));
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace("/admin");
        return;
      }
      const profile = await fetchProfile(session.user.id);
      if (!profile || !isAdminRole(profile.role)) {
        router.replace("/admin");
        return;
      }
      if (!cancelled) {
        setAdminUserId(session.user.id);
        setAdminDisplayName(profile.full_name || profile.email || null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading || !propertyId || !adminUserId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="admin-shell min-h-dvh bg-[#F7F8FA]">
      <div className="admin-shell-main w-full max-w-none px-4 py-6 sm:px-6 lg:px-8">
        <PropertyCmsEditor
          propertyId={propertyId}
          adminUserId={adminUserId}
          adminDisplayName={adminDisplayName}
          onBack={() => router.push("/admin?tab=properties")}
        />
      </div>
    </div>
  );
}
