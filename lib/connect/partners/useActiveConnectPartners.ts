"use client";

import { useCallback, useEffect, useState } from "react";

export interface ActiveConnectPartnerOption {
  id: string;
  company_name: string;
  manager_name: string;
  status: string;
  email?: string;
  phone?: string;
  city?: string | null;
}

export function useActiveConnectPartners() {
  const [partners, setPartners] = useState<ActiveConnectPartnerOption[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/connect/partners");
      const data = await res.json();
      const rows = (data.partners ?? []) as ActiveConnectPartnerOption[];
      setPartners(rows.filter((p) => p.status === "active"));
    } catch {
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { partners, loading, refresh };
}
