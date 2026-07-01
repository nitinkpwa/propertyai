import { fetchPropertyDetailById } from "@/lib/properties/queries";
import { notFound } from "next/navigation";
import PropertyDetailView from "./PropertyDetailView";

interface PageProps {
  params: Promise<{ id: string }>;
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
