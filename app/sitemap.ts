import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://tech172.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    "",
    "/ask",
    "/properties",
    "/connect",
    "/seller",
    "/login",
    "/register",
  ];

  return routes.map((path) => ({
    url: `${siteUrl}${path || "/"}`,
    lastModified: now,
    changeFrequency: path === "" || path === "/ask" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/ask" || path === "/properties" ? 0.9 : 0.6,
  }));
}
