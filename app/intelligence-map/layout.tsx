import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Full Intelligence Map | AreaIQ",
  description:
    "Explore Tricity property intelligence with full pan, zoom, heatmaps, filters, builders, infrastructure, and AI insights.",
};

export default function IntelligenceMapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
