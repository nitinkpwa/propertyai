-- Admin-only legal verification flags for Property Studio moderation.
-- Internal use only — never expose as buyer-facing badges.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS approved_building_plan boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rera_certificate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS title_deed_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS noc_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completion_certificate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS occupation_certificate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS environment_clearance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fire_clearance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bank_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS govt_layout_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS legal_verification_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS legal_verification_updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.properties.approved_building_plan IS 'Admin: approved building plan verified';
COMMENT ON COLUMN public.properties.rera_certificate IS 'Admin: RERA registration certificate verified';
COMMENT ON COLUMN public.properties.title_deed_verified IS 'Admin: title deed verified';
COMMENT ON COLUMN public.properties.noc_verified IS 'Admin: NOCs verified';
COMMENT ON COLUMN public.properties.completion_certificate IS 'Admin: completion certificate verified';
COMMENT ON COLUMN public.properties.occupation_certificate IS 'Admin: occupation certificate verified';
COMMENT ON COLUMN public.properties.environment_clearance IS 'Admin: environmental clearance verified';
COMMENT ON COLUMN public.properties.fire_clearance IS 'Admin: fire safety clearance verified';
COMMENT ON COLUMN public.properties.bank_approved IS 'Admin: bank-approved project';
COMMENT ON COLUMN public.properties.govt_layout_approved IS 'Admin: government layout approved';
COMMENT ON COLUMN public.properties.legal_verification_updated_at IS 'Admin: last legal verification toggle update';
COMMENT ON COLUMN public.properties.legal_verification_updated_by IS 'Admin: profile id who last updated legal verification';

CREATE INDEX IF NOT EXISTS idx_properties_legal_bank_approved
  ON public.properties (bank_approved)
  WHERE bank_approved = true;

CREATE INDEX IF NOT EXISTS idx_properties_legal_govt_layout
  ON public.properties (govt_layout_approved)
  WHERE govt_layout_approved = true;

CREATE INDEX IF NOT EXISTS idx_properties_legal_rera_cert
  ON public.properties (rera_certificate)
  WHERE rera_certificate = false;
