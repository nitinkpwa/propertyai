-- Seed placeholder AreaIQ intelligence for Dhakoli + Peer Muchalla.
-- Idempotent: skips rows that already exist for the same locality+city.

INSERT INTO public.area_intelligence (
  locality,
  city,
  overview,
  connectivity,
  airport_distance,
  metro,
  schools,
  hospitals,
  malls,
  future_infrastructure,
  demand,
  supply,
  rental_market,
  capital_appreciation,
  builder_activity,
  risk_level,
  suitable_for
)
SELECT
  v.locality,
  v.city,
  v.overview,
  v.connectivity,
  v.airport_distance,
  v.metro,
  v.schools,
  v.hospitals,
  v.malls,
  v.future_infrastructure,
  v.demand,
  v.supply,
  v.rental_market,
  v.capital_appreciation,
  v.builder_activity,
  v.risk_level,
  v.suitable_for
FROM (
  VALUES
    (
      'Dhakoli'::text,
      'Zirakpur'::text,
      'Dhakoli is an emerging Zirakpur micro-market near Patiala Road with improving residential inventory and mid-segment buyer demand. AreaIQ Score placeholder: 76/100. Market confidence: medium.'::text,
      'Patiala Road / NH access toward Zirakpur and Banur; Chandigarh reachable via VIP Road belt.'::text,
      '~12–18 km to Chandigarh Airport (IXC) depending on route.'::text,
      'No operational metro; rely on road corridors.'::text,
      'Local schools in Zirakpur / Baltana catchment; verify commute for specific projects.'::text,
      'Hospitals concentrated in Zirakpur and Panchkula — check project-level distance.'::text,
      'Retail along VIP Road and Zirakpur high street.'::text,
      'Continued Zirakpur corridor densification and road upgrades.'::text,
      'Medium — steady end-user and investor interest in value segment.'::text,
      'Medium — selective new launches; not overbuilt vs core VIP Road.'::text,
      'Indicative rental yield placeholder ~3.9%.'::text,
      'Placeholder growth outlook moderate; validate with live comps.'::text,
      'Regional developers active in Zirakpur belt — verify delivery track record.'::text,
      'Medium — title/RERA checks still essential on every deal.'::text,
      ARRAY['end_user', 'value_investors', 'first_home']::text[]
    ),
    (
      'Peer Muchalla'::text,
      'Zirakpur'::text,
      'Peer Muchalla sits on the VIP Road growth belt of Zirakpur with stronger connectivity cues than outer Patiala Road pockets. AreaIQ Score placeholder: 78/100. Market confidence: medium-high.'::text,
      'VIP Road primary access; links toward Zirakpur, Gazipur, and airport-side corridors.'::text,
      '~10–16 km to Chandigarh Airport (IXC) depending on route.'::text,
      'No operational metro; road-led connectivity.'::text,
      'Schools accessible via Zirakpur / VIP Road catchment.'::text,
      'Multi-specialty options in Zirakpur and Panchkula within typical drive times.'::text,
      'VIP Road retail and Zirakpur commercial nodes.'::text,
      'VIP Road densification and Zirakpur infrastructure pipeline.'::text,
      'Medium — healthy enquiry for mid-premium inventory.'::text,
      'Medium — balanced vs demand; watch new tower supply.'::text,
      'Indicative rental yield placeholder ~4.0%.'::text,
      'Placeholder growth outlook constructive along VIP Road.'::text,
      'Mix of regional and established Tricity builders — diligence required.'::text,
      'Medium — standard Tricity legal diligence applies.'::text,
      ARRAY['end_user', 'investors', 'rental_seekers']::text[]
    )
) AS v(
  locality,
  city,
  overview,
  connectivity,
  airport_distance,
  metro,
  schools,
  hospitals,
  malls,
  future_infrastructure,
  demand,
  supply,
  rental_market,
  capital_appreciation,
  builder_activity,
  risk_level,
  suitable_for
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.area_intelligence ai
  WHERE lower(ai.locality) = lower(v.locality)
    AND lower(coalesce(ai.city, '')) = lower(coalesce(v.city, ''))
);
