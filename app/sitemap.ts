import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://tech172.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes = [
    "",
    "/ask",
    "/properties",
    "/connect",
    "/seller",
    "/login",
    "/register",
  ];

  const entries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${siteUrl}${path || "/"}`,
    lastModified: now,
    changeFrequency: path === "" || path === "/ask" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/ask" || path === "/properties" ? 0.9 : 0.6,
  }));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    try {
      const supabase = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data } = await supabase
        .from("properties")
        .select("id, updated_at")
        .eq("status", "active")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(500);

      for (const row of data ?? []) {
        entries.push({
          url: `${siteUrl}/property/${row.id}`,
          lastModified: row.updated_at ? new Date(row.updated_at) : now,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    } catch {
      /* keep static sitemap if catalog query fails */
    }
  }

  return entries;
}
