-- Real exam date and self-reported result, per student.
--
-- Students enter the date of their RBT exam; after that date the app asks
-- whether they passed. This gives a real pass rate for the business and data
-- to check whether the readiness score predicts the result.
--
-- NOT APPLIED. Run this in Supabase before deploying the /api/exam-outcome
-- endpoint. Additive only: three nullable columns, no backfill, no locks
-- beyond a brief ALTER on a small table.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS exam_date DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS exam_result TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS exam_result_reported_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_exam_result_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_exam_result_check
      CHECK (exam_result IS NULL OR exam_result IN ('passed', 'not_passed'));
  END IF;
END $$;
