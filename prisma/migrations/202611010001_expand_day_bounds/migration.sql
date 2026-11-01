-- Additive expansion only: retain all rows, foreign keys, grants and RLS policies.
-- The application validates against the exact published plan; 365 is a DB ceiling.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public."StudyDayProgress"
  DROP CONSTRAINT "StudyDayProgress_day_check",
  ADD CONSTRAINT "StudyDayProgress_day_check" CHECK (day BETWEEN 1 AND 365);
ALTER TABLE public."StudyBookmark"
  DROP CONSTRAINT "StudyBookmark_day_check",
  ADD CONSTRAINT "StudyBookmark_day_check" CHECK (day BETWEEN 1 AND 365);
COMMIT;
