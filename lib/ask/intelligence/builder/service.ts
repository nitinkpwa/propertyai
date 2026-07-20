import { supabase } from "@/lib/supabase";
import type { ListingProperty } from "@/lib/properties/types";
import { UNAVAILABLE_COPY } from "../taxonomy";
import type { BuilderIntelligence } from "../types";

function emptyBuilder(name: string): BuilderIntelligence {
  return {
    builderName: name,
    projects: [],
    completedProjects: [],
    constructionQuality: null,
    deliveryRecord: null,
    rera: null,
    reputation: null,
    customerReviews: null,
    pros: [],
    cons: [],
    riskScore: null,
    areaiqBuilderScore: null,
    futureLaunches: null,
    source: "unavailable",
  };
}

/**
 * Builder Knowledge — DB first, then derive project list from matched listings.
 */
export async function getBuilderIntelligence(
  builderName: string | null,
  listings: ListingProperty[] = [],
): Promise<BuilderIntelligence | null> {
  const name =
    builderName?.trim() ||
    listings.find((l) => l.builderName)?.builderName?.trim() ||
    null;
  if (!name) return null;

  try {
    const { data, error } = await supabase
      .from("builder_intelligence")
      .select("*")
      .ilike("builder_name", `%${name}%`)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        builderName: (data.builder_name as string) ?? name,
        projects: Array.isArray(data.projects) ? (data.projects as string[]) : [],
        completedProjects: Array.isArray(data.completed_projects)
          ? (data.completed_projects as string[])
          : [],
        constructionQuality: (data.construction_quality as string) ?? null,
        deliveryRecord: (data.delivery_record as string) ?? null,
        rera: (data.rera as string) ?? null,
        reputation: (data.reputation as string) ?? null,
        customerReviews: (data.customer_reviews as string) ?? null,
        pros: Array.isArray(data.pros) ? (data.pros as string[]) : [],
        cons: Array.isArray(data.cons) ? (data.cons as string[]) : [],
        riskScore: typeof data.risk_score === "number" ? data.risk_score : null,
        areaiqBuilderScore:
          typeof data.areaiq_builder_score === "number"
            ? data.areaiq_builder_score
            : null,
        futureLaunches: (data.future_launches as string) ?? null,
        source: "database",
      };
    }
  } catch {
    /* table missing */
  }

  // Derive from listings only — never invent reputation
  const projects = [
    ...new Set(
      listings
        .filter((l) => l.builderName?.toLowerCase().includes(name.toLowerCase()))
        .map((l) => l.name),
    ),
  ];

  if (projects.length === 0) {
    return { ...emptyBuilder(name), reputation: UNAVAILABLE_COPY };
  }

  return {
    ...emptyBuilder(name),
    projects,
    source: "listings",
    reputation: UNAVAILABLE_COPY,
  };
}

export function formatBuilderForComposer(builder: BuilderIntelligence | null): string {
  if (!builder) return "Builder Intelligence: not requested.";
  const lines = [`Builder: ${builder.builderName}`, `Source: ${builder.source}`];
  if (builder.projects.length) lines.push(`Projects in results: ${builder.projects.join(", ")}`);
  if (builder.source === "database") {
    if (builder.constructionQuality) lines.push(`Quality: ${builder.constructionQuality}`);
    if (builder.deliveryRecord) lines.push(`Delivery: ${builder.deliveryRecord}`);
    if (builder.rera) lines.push(`RERA: ${builder.rera}`);
    if (builder.reputation) lines.push(`Reputation: ${builder.reputation}`);
    if (builder.areaiqBuilderScore != null) {
      lines.push(`AreaIQ Builder Score: ${builder.areaiqBuilderScore}/100`);
    }
    if (builder.pros.length) lines.push(`Pros: ${builder.pros.join("; ")}`);
    if (builder.cons.length) lines.push(`Cons: ${builder.cons.join("; ")}`);
  } else {
    lines.push(UNAVAILABLE_COPY);
  }
  return lines.join("\n");
}
