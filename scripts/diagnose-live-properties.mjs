import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, service);
const publicClient = createClient(url, anon);

const CARD =
  "id, seller_id, title, description, type, sub_type, price, calculated_price, area_sqft, bedrooms, bathrooms, location, city, sector, lat, lng, photos, amenities, status, is_featured, created_at, updated_at, views, builder_name, furnishing, parking, facing, nearby_places, rera_number, possession, featured_image, deleted_at";
const CARD_NO_CALC = CARD.replace("price, calculated_price, area_sqft", "price, area_sqft");
const WITH_SELLER = `${CARD}, seller:profiles!properties_seller_id_fkey(full_name)`;
const WITH_SELLER_NO_CALC = `${CARD_NO_CALC}, seller:profiles!properties_seller_id_fkey(full_name)`;

async function headCount(label, builder) {
  const { count, error } = await builder;
  return [label, { count, error: error?.message ?? null }];
}

async function trySelect(label, client, select) {
  const { data, error } = await client
    .from("properties")
    .select(select)
    .eq("status", "active")
    .is("deleted_at", null)
    .limit(5);
  return {
    label,
    n: data?.length ?? 0,
    error: error?.message ?? null,
    code: error?.code ?? null,
    ids: (data || []).map((r) => r.id),
    titles: (data || []).map((r) => r.title),
  };
}

const counts = Object.fromEntries(
  await Promise.all([
    headCount("all", admin.from("properties").select("id", { count: "exact", head: true })),
    headCount(
      "active",
      admin.from("properties").select("id", { count: "exact", head: true }).eq("status", "active"),
    ),
    headCount(
      "active_not_deleted",
      admin
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .is("deleted_at", null),
    ),
  ]),
);

for (const col of ["approval_status", "is_published", "calculated_price"]) {
  const { error } = await admin.from("properties").select(col).limit(1);
  counts[`column_${col}`] = error
    ? { exists: false, error: error.message }
    : { exists: true };
}

const sample = await admin
  .from("properties")
  .select("id,title,status,deleted_at,price,calculated_price,sub_type")
  .eq("status", "active")
  .is("deleted_at", null)
  .limit(8);

console.log(
  JSON.stringify(
    {
      counts,
      sampleActive: { error: sample.error?.message ?? null, rows: sample.data },
      selects: await Promise.all([
        trySelect("anon+card+calc+seller (HOME)", publicClient, WITH_SELLER),
        trySelect("anon+card+nocalc+seller", publicClient, WITH_SELLER_NO_CALC),
        trySelect("anon+card+calc", publicClient, CARD),
        trySelect("anon+card+nocalc", publicClient, CARD_NO_CALC),
        trySelect("service+card+calc+seller", admin, WITH_SELLER),
      ]),
    },
    null,
    2,
  ),
);
