-- Progressive buyer profiling fields (AreaIQ premium CRM UX)

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS buying_purpose text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS buying_timeline text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loan_status text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS occupation text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS family_size integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS buyer_notes text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_email text;

COMMENT ON COLUMN public.profiles.buying_purpose IS 'self | investment | family | rental_income';
COMMENT ON COLUMN public.profiles.buying_timeline IS 'immediate | 15_days | 1_month | 3_months | 6_months | exploring';
COMMENT ON COLUMN public.profiles.loan_status IS 'need_loan | approved | no_loan';
COMMENT ON COLUMN public.profiles.contact_email IS 'Optional contact email (separate from auth email)';
