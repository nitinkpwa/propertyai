-- AreaIQ Property Intelligence Scoring Engine (V1.0)
-- Cached pillar scores + admin-editable weight configs.
-- Scores are always recomputable from factors; cache is for cards/listings.

-- ── Cached scores on properties ─────────────────────────────────────────────
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS areaiq_score numeric,
  ADD COLUMN IF NOT EXISTS investment_score numeric,
  ADD COLUMN IF NOT EXISTS legal_score numeric,
  ADD COLUMN IF NOT EXISTS builder_score numeric,
  ADD COLUMN IF NOT EXISTS location_score numeric,
  ADD COLUMN IF NOT EXISTS score_confidence numeric,
  ADD COLUMN IF NOT EXISTS score_label text,
  ADD COLUMN IF NOT EXISTS legal_score_label text,
  ADD COLUMN IF NOT EXISTS investment_score_label text,
  ADD COLUMN IF NOT EXISTS price_fairness_label text,
  ADD COLUMN IF NOT EXISTS scores_computed_at timestamptz,
  ADD COLUMN IF NOT EXISTS scores_engine_version text,
  ADD COLUMN IF NOT EXISTS score_breakdown jsonb;

COMMENT ON COLUMN public.properties.areaiq_score IS 'AreaIQ Score 0-100 from scoring engine — deterministic, never AI-invented';
COMMENT ON COLUMN public.properties.investment_score IS 'Investment Score 0-100 — independent pillar';
COMMENT ON COLUMN public.properties.legal_score IS 'Legal Score 0-100 from verified documents only';
COMMENT ON COLUMN public.properties.builder_score IS 'Builder Score 0-100';
COMMENT ON COLUMN public.properties.location_score IS 'Location Score 0-100';
COMMENT ON COLUMN public.properties.score_confidence IS 'Overall confidence % for AreaIQ score';
COMMENT ON COLUMN public.properties.score_label IS 'AreaIQ band label e.g. Excellent / Very Good';
COMMENT ON COLUMN public.properties.legal_score_label IS 'Legal band label e.g. Verified / Partially Verified';
COMMENT ON COLUMN public.properties.investment_score_label IS 'Investment band label e.g. High Growth';
COMMENT ON COLUMN public.properties.price_fairness_label IS 'Undervalued | Fair Value | Slightly Premium | Overpriced';
COMMENT ON COLUMN public.properties.scores_computed_at IS 'When cached scores were last written by the engine';
COMMENT ON COLUMN public.properties.scores_engine_version IS 'lib/scoring engine version that produced the cache';
COMMENT ON COLUMN public.properties.score_breakdown IS 'Full factor breakdown + explanations for admin audit';

CREATE INDEX IF NOT EXISTS idx_properties_areaiq_score
  ON public.properties (areaiq_score DESC NULLS LAST)
  WHERE status = 'active' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_properties_investment_score
  ON public.properties (investment_score DESC NULLS LAST)
  WHERE status = 'active' AND deleted_at IS NULL;

-- ── Admin weight configuration ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scoring_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('areaiq', 'investment', 'legal', 'builder', 'location')),
  label text NOT NULL DEFAULT 'Default',
  weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.scoring_weights IS 'Admin-editable relative weights for Property Intelligence Scoring Engine';

CREATE INDEX IF NOT EXISTS idx_scoring_weights_active
  ON public.scoring_weights (kind, is_active, updated_at DESC);

-- Seed inactive defaults as reference rows (engine also has code defaults)
INSERT INTO public.scoring_weights (kind, label, weights, is_active, notes)
SELECT v.kind, v.label, v.weights::jsonb, false, v.notes
FROM (
  VALUES
    (
      'areaiq',
      'AreaIQ defaults v1',
      '{"locationQuality":20,"builderReputation":15,"constructionQuality":10,"priceFairness":15,"connectivity":10,"amenities":10,"legalVerification":10,"demand":5,"futureInfrastructure":5,"livability":10}',
      'Relative weights normalized at runtime (spec sum may exceed 100)'
    ),
    (
      'investment',
      'Investment defaults v1',
      '{"capitalAppreciation":14,"rentalYield":12,"entryPrice":12,"exitPotential":10,"supplyVsDemand":10,"infrastructureGrowth":10,"liquidity":8,"builderReliability":10,"marketTrend":8,"risk":6}',
      'Independent investment pillar'
    ),
    (
      'legal',
      'Legal defaults v1',
      '{"rera":18,"registry":12,"ownership":12,"approvedMaps":10,"noc":10,"occupationCertificate":10,"bankApproval":8,"titleClear":12,"encumbrance":8,"litigation":0}',
      'Documents only; litigation applied as penalty'
    ),
    (
      'builder',
      'Builder defaults v1',
      '{"projectsDelivered":15,"deliveryDelays":15,"customerRating":15,"quality":12,"legalHistory":12,"completionPercent":10,"financialStability":11,"completedProjects":5,"underConstruction":5}',
      'Builder reliability sub-score'
    ),
    (
      'location',
      'Location defaults v1',
      '{"schools":12,"hospitals":12,"highways":10,"metro":14,"airport":8,"itParks":12,"demand":12,"safety":10,"futureDevelopment":10}',
      'Location quality sub-score'
    )
) AS v(kind, label, weights, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.scoring_weights sw WHERE sw.kind = v.kind AND sw.label = v.label
);

ALTER TABLE public.scoring_weights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scoring_weights_admin_all ON public.scoring_weights;
CREATE POLICY scoring_weights_admin_all ON public.scoring_weights
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Authenticated read of active weights (for server scoring); public cannot write
DROP POLICY IF EXISTS scoring_weights_read_active ON public.scoring_weights;
CREATE POLICY scoring_weights_read_active ON public.scoring_weights
  FOR SELECT
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ));
