-- Add new score columns to analyses
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS overall_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skill_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS experience_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS education_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS project_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_content boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS word_count integer NOT NULL DEFAULT 0;

-- Public leaderboard view: no emails/phones/raw_text/user_id, only display name + scores
CREATE OR REPLACE VIEW public.leaderboard
WITH (security_invoker=on) AS
SELECT
  a.id,
  COALESCE(NULLIF(a.parsed->>'candidate_name',''), 'Anonymous') AS candidate_name,
  a.overall_score,
  a.ats_score,
  a.match_score,
  a.skill_score,
  a.experience_score,
  a.education_score,
  a.project_score,
  a.created_at
FROM public.analyses a
WHERE a.overall_score > 0;

-- Allow anyone (incl. anon) to read the leaderboard view
-- View uses security_invoker, so we need a permissive SELECT policy on base for the masked columns.
-- To keep PII protected we instead create a SECURITY DEFINER function returning only safe rows.
DROP VIEW IF EXISTS public.leaderboard;

CREATE OR REPLACE FUNCTION public.get_leaderboard(_limit integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  candidate_name text,
  overall_score integer,
  ats_score integer,
  match_score integer,
  skill_score integer,
  experience_score integer,
  education_score integer,
  project_score integer,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    COALESCE(NULLIF(a.parsed->>'candidate_name',''), 'Anonymous') AS candidate_name,
    a.overall_score,
    a.ats_score,
    a.match_score,
    a.skill_score,
    a.experience_score,
    a.education_score,
    a.project_score,
    a.created_at
  FROM public.analyses a
  WHERE a.overall_score > 0
  ORDER BY a.overall_score DESC, a.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 100));
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO anon, authenticated;

-- Global stats function (counts, avg) - safe aggregates only
CREATE OR REPLACE FUNCTION public.get_global_stats()
RETURNS TABLE (
  total_resumes bigint,
  avg_overall numeric,
  avg_ats numeric,
  top_score integer,
  top_candidate text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.analyses)::bigint,
    COALESCE((SELECT round(avg(overall_score)::numeric, 1) FROM public.analyses WHERE overall_score > 0), 0),
    COALESCE((SELECT round(avg(ats_score)::numeric, 1) FROM public.analyses WHERE ats_score > 0), 0),
    COALESCE((SELECT max(overall_score) FROM public.analyses), 0),
    COALESCE(
      (SELECT COALESCE(NULLIF(parsed->>'candidate_name',''), 'Anonymous')
       FROM public.analyses
       WHERE overall_score > 0
       ORDER BY overall_score DESC, created_at DESC
       LIMIT 1),
      '—'
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_global_stats() TO anon, authenticated;