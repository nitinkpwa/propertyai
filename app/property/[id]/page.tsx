import type { Metadata } from "next";
import { fetchPropertyDetailById } from "@/lib/properties/detail";
import { notFound } from "next/navigation";
import PropertyDetailView from "./PropertyDetailView";

interface PageProps {
  params: Promise<{ id: string }>;
}

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://tech172.com";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const property = await fetchPropertyDetailById(id);
    if (!property) {
      return { title: "Property not found" };
    }
    const title = `${property.name} · ${property.city}`;
    const description =
      property.description?.slice(0, 160) ||
      `${property.name} in ${property.location}, ${property.city} — AreaIQ Property Intelligence.`;
    const image = property.images?.find((img) => img.url)?.url;
    return {
      title,
      description,
      alternates: { canonical: `/property/${id}` },
      openGraph: {
        title,
        description,
        url: `${siteUrl}/property/${id}`,
        images: image ? [{ url: image }] : undefined,
      },
    };
  } catch {
    return { title: "Property" };
  }
}

export default async function PropertyDetailPage({ params }: PageProps) {
  const { id } = await params;

  let property: Awaited<ReturnType<typeof fetchPropertyDetailById>> = null;
  try {
    property = await fetchPropertyDetailById(id);
  } catch (error) {
    console.error("PropertyDetailPage:", error);
  }

  if (!property) {
    notFound();
  }

  const publicProperty = {
    ...property,
    contactPhone: "",
    whatsapp: "",
  };

  return <PropertyDetailView property={publicProperty} />;
}
