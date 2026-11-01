-- Additive migration: retain existing users, roles and lesson history.
ALTER TABLE public."User" ADD COLUMN "emailVerifiedAt" TIMESTAMPTZ(3);

CREATE TABLE public."EmailChallenge" (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL CHECK (email = lower(btrim(email))),
  purpose TEXT NOT NULL CHECK (purpose IN ('register', 'reset')),
  "codeHash" TEXT NOT NULL CHECK ("codeHash" ~ '^[a-f0-9]{64}$'),
  name TEXT,
  "passwordHash" TEXT,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (purpose <> 'register' OR (name IS NOT NULL AND "passwordHash" IS NOT NULL))
);
CREATE UNIQUE INDEX "EmailChallenge_email_purpose_key" ON public."EmailChallenge" (email, purpose);
CREATE INDEX "EmailChallenge_expiresAt_idx" ON public."EmailChallenge" ("expiresAt");
ALTER TABLE public."EmailChallenge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EmailChallenge" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."EmailChallenge" TO kairon_auth;
CREATE POLICY auth_challenges ON public."EmailChallenge" TO kairon_auth USING (true) WITH CHECK (true);
GRANT INSERT ON public."User" TO kairon_auth;
GRANT UPDATE ("passwordHash", "emailVerifiedAt", "sessionVersion", "updatedAt") ON public."User" TO kairon_auth;
CREATE POLICY auth_register ON public."User" FOR INSERT TO kairon_auth WITH CHECK (role = 'USER' AND NOT blocked);
CREATE POLICY auth_reset ON public."User" FOR UPDATE TO kairon_auth USING (NOT blocked) WITH CHECK (NOT blocked);

CREATE TABLE public."StudyDayProgress" (
  "userId" TEXT NOT NULL REFERENCES public."User" (id) ON DELETE CASCADE,
  day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 60),
  "completedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", day)
);
CREATE TABLE public."StudyBookmark" (
  "userId" TEXT PRIMARY KEY REFERENCES public."User" (id) ON DELETE CASCADE,
  day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 60),
  "lessonId" TEXT,
  note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 1000),
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE public."StudyDayProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StudyDayProgress" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."StudyBookmark" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StudyBookmark" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."StudyDayProgress", public."StudyBookmark" TO kairon_runtime;
CREATE POLICY days_own ON public."StudyDayProgress" TO kairon_runtime
  USING ("userId" = nullif(current_setting('app.user_id', true), ''))
  WITH CHECK ("userId" = nullif(current_setting('app.user_id', true), ''));
CREATE POLICY bookmark_own ON public."StudyBookmark" TO kairon_runtime
  USING ("userId" = nullif(current_setting('app.user_id', true), ''))
  WITH CHECK ("userId" = nullif(current_setting('app.user_id', true), ''));
DO $$ BEGIN
  EXECUTE format('CREATE POLICY owner_manage_challenges ON public."EmailChallenge" TO %I USING (true) WITH CHECK (true)', current_user);
  EXECUTE format('CREATE POLICY owner_manage_days ON public."StudyDayProgress" TO %I USING (true) WITH CHECK (true)', current_user);
  EXECUTE format('CREATE POLICY owner_manage_bookmark ON public."StudyBookmark" TO %I USING (true) WITH CHECK (true)', current_user);
END $$;

-- Shared atomic limits across all serverless instances; identities are HMACs.
CREATE FUNCTION public.kairon_consume_limit(attempt_key TEXT, max_count INTEGER, window_seconds INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE attempt_count INTEGER;
BEGIN
  IF attempt_key !~ '^[a-f0-9]{64}$' OR max_count NOT BETWEEN 1 AND 1000 OR window_seconds NOT BETWEEN 1 AND 86400 THEN RETURN false; END IF;
  DELETE FROM public."LoginAttempt" WHERE "windowStartedAt" < CURRENT_TIMESTAMP - interval '2 days';
  INSERT INTO public."LoginAttempt" (key, attempts, "windowStartedAt") VALUES (attempt_key, 1, CURRENT_TIMESTAMP)
  ON CONFLICT (key) DO UPDATE SET
    attempts = CASE WHEN public."LoginAttempt"."windowStartedAt" <= CURRENT_TIMESTAMP - make_interval(secs => window_seconds)
      THEN 1 ELSE LEAST(public."LoginAttempt".attempts + 1, 1000000) END,
    "windowStartedAt" = CASE WHEN public."LoginAttempt"."windowStartedAt" <= CURRENT_TIMESTAMP - make_interval(secs => window_seconds)
      THEN CURRENT_TIMESTAMP ELSE public."LoginAttempt"."windowStartedAt" END
  RETURNING attempts INTO attempt_count;
  RETURN attempt_count <= max_count;
END $$;

CREATE FUNCTION public.kairon_issue_challenge(challenge_id TEXT, mail TEXT, kind TEXT, digest TEXT, display_name TEXT, password_hash TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF kind NOT IN ('register', 'reset') OR digest !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF;
  -- Serializes reissues for one email; only the latest code can be used.
  PERFORM pg_advisory_xact_lock(hashtextextended(mail || ':' || kind, 0));
  DELETE FROM public."EmailChallenge" WHERE "expiresAt" < CURRENT_TIMESTAMP - interval '1 day';
  IF kind = 'register' AND EXISTS (SELECT FROM public."User" WHERE email = mail) THEN RETURN false; END IF;
  IF kind = 'reset' AND NOT EXISTS (SELECT FROM public."User" WHERE email = mail AND NOT blocked) THEN RETURN false; END IF;
  DELETE FROM public."EmailChallenge" WHERE email = mail AND purpose = kind;
  INSERT INTO public."EmailChallenge" (id, email, purpose, "codeHash", name, "passwordHash", "expiresAt")
    VALUES (challenge_id, mail, kind, digest, display_name, password_hash, CURRENT_TIMESTAMP + interval '10 minutes');
  RETURN true;
END $$;

CREATE FUNCTION public.kairon_finish_challenge(challenge_id TEXT, digest TEXT, replacement_hash TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE challenge public."EmailChallenge"%ROWTYPE;
BEGIN
  SELECT * INTO challenge FROM public."EmailChallenge" WHERE id = challenge_id FOR UPDATE;
  IF NOT FOUND OR challenge."expiresAt" <= CURRENT_TIMESTAMP OR challenge.attempts >= 5 THEN RETURN false; END IF;
  UPDATE public."EmailChallenge" SET attempts = attempts + 1 WHERE id = challenge_id;
  IF challenge."codeHash" <> digest THEN RETURN false; END IF;
  IF challenge.purpose = 'register' AND replacement_hash IS NOT NULL THEN RETURN false; END IF;
  IF challenge.purpose = 'register' THEN
    INSERT INTO public."User" (id, email, name, "passwordHash", "emailVerifiedAt")
      VALUES (gen_random_uuid()::text, challenge.email, challenge.name, challenge."passwordHash", CURRENT_TIMESTAMP)
      ON CONFLICT (email) DO NOTHING;
    IF NOT FOUND THEN RETURN false; END IF;
  ELSE
    IF replacement_hash IS NULL OR replacement_hash !~ '^\$2[aby]\$12\$' THEN RETURN false; END IF;
    UPDATE public."User" SET "passwordHash" = replacement_hash, "emailVerifiedAt" = CURRENT_TIMESTAMP,
      "sessionVersion" = "sessionVersion" + 1, "updatedAt" = CURRENT_TIMESTAMP
      WHERE email = challenge.email AND NOT blocked;
    IF NOT FOUND THEN RETURN false; END IF;
  END IF;
  DELETE FROM public."EmailChallenge" WHERE id = challenge_id;
  RETURN true;
END $$;

CREATE FUNCTION public.kairon_cancel_challenge(challenge_id TEXT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $$
  DELETE FROM public."EmailChallenge" WHERE id = challenge_id;
$$;

CREATE OR REPLACE FUNCTION public.kairon_lookup_login(login_email TEXT)
RETURNS TABLE (id TEXT, email TEXT, name TEXT, "passwordHash" TEXT, role public."Role", blocked BOOLEAN, "sessionVersion" INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT "id", "email", "name", "passwordHash", "role", "blocked", "sessionVersion"
  FROM public."User" WHERE "email" = lower(btrim(login_email)) AND "emailVerifiedAt" IS NOT NULL LIMIT 1;
$$;

GRANT CREATE ON SCHEMA public TO kairon_auth;
ALTER FUNCTION public.kairon_consume_limit(TEXT, INTEGER, INTEGER) OWNER TO kairon_auth;
ALTER FUNCTION public.kairon_issue_challenge(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) OWNER TO kairon_auth;
ALTER FUNCTION public.kairon_finish_challenge(TEXT, TEXT, TEXT) OWNER TO kairon_auth;
ALTER FUNCTION public.kairon_cancel_challenge(TEXT) OWNER TO kairon_auth;
REVOKE CREATE ON SCHEMA public FROM kairon_auth;
REVOKE ALL ON FUNCTION public.kairon_consume_limit(TEXT, INTEGER, INTEGER),
  public.kairon_issue_challenge(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT),
  public.kairon_finish_challenge(TEXT, TEXT, TEXT), public.kairon_cancel_challenge(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kairon_consume_limit(TEXT, INTEGER, INTEGER),
  public.kairon_issue_challenge(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT),
  public.kairon_finish_challenge(TEXT, TEXT, TEXT), public.kairon_cancel_challenge(TEXT) TO kairon_runtime;
