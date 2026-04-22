ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text;

ALTER TABLE public.job_profiles
  ADD COLUMN IF NOT EXISTS preferred_location text;

CREATE INDEX IF NOT EXISTS analyses_city_idx ON public.analyses (city);