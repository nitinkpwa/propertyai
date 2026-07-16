import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Legacy property URL — redirect to canonical /property/[id]. */
export default async function LegacyPropertyRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`/property/${id}`);
}
