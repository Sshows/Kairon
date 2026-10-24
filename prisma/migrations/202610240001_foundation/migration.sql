-- Миграции выполняются владельцем отдельной базы Kairon, не runtime-пользователем.
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'USER',
  "blocked" BOOLEAN NOT NULL DEFAULT false,
  "sessionVersion" INTEGER NOT NULL DEFAULT 1,
  "ethicsAcceptedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
ALTER TABLE "User" ADD CONSTRAINT "User_email_normalized" CHECK ("email" = lower(btrim("email")));

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "action" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

CREATE TABLE "LoginAttempt" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "attempts" INTEGER NOT NULL DEFAULT 1,
  "windowStartedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "LoginAttempt_windowStartedAt_idx" ON "LoginAttempt"("windowStartedAt");

-- Проверка на конфликт важна: нельзя переиспользовать неизвестную роль с BYPASSRLS.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'kairon_runtime') THEN
    CREATE ROLE kairon_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'kairon_auth') THEN
    CREATE ROLE kairon_auth NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
  END IF;
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname IN ('kairon_runtime', 'kairon_auth')
    AND (rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb)) THEN
    RAISE EXCEPTION 'Kairon roles must not have elevated privileges';
  END IF;
  IF EXISTS (SELECT FROM pg_catalog.pg_auth_members WHERE member =
    (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'kairon_runtime')) THEN
    RAISE EXCEPTION 'Runtime must not be a member of other roles';
  END IF;
  EXECUTE format('GRANT kairon_auth TO %I', current_user);
END $$;

GRANT USAGE ON SCHEMA public TO kairon_runtime, kairon_auth;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT SELECT ON "User" TO kairon_runtime, kairon_auth;
GRANT UPDATE ("ethicsAcceptedAt", "updatedAt") ON "User" TO kairon_runtime;
GRANT SELECT, INSERT ON "AuditLog" TO kairon_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON "LoginAttempt" TO kairon_auth;

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
ALTER TABLE "LoginAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoginAttempt" FORCE ROW LEVEL SECURITY;

CREATE POLICY user_read_own ON "User" FOR SELECT TO kairon_runtime
  USING ("id" = nullif(current_setting('app.user_id', true), ''));
CREATE POLICY user_accept_ethics ON "User" FOR UPDATE TO kairon_runtime
  USING ("id" = nullif(current_setting('app.user_id', true), '') AND NOT "blocked")
  WITH CHECK ("id" = nullif(current_setting('app.user_id', true), '') AND NOT "blocked");
CREATE POLICY auth_lookup ON "User" FOR SELECT TO kairon_auth USING (true);
CREATE POLICY audit_read_own ON "AuditLog" FOR SELECT TO kairon_runtime
  USING ("userId" = nullif(current_setting('app.user_id', true), ''));
CREATE POLICY audit_insert_own ON "AuditLog" FOR INSERT TO kairon_runtime
  WITH CHECK ("userId" = nullif(current_setting('app.user_id', true), ''));
CREATE POLICY auth_login_attempts ON "LoginAttempt" TO kairon_auth USING (true) WITH CHECK (true);

-- Владелец миграций нужен для CLI выдачи аккаунтов. Runtime не является его членом.
DO $$ BEGIN
  EXECUTE format('CREATE POLICY owner_manage_users ON "User" TO %I USING (true) WITH CHECK (true)', current_user);
  EXECUTE format('CREATE POLICY owner_manage_audit ON "AuditLog" TO %I USING (true) WITH CHECK (true)', current_user);
  EXECUTE format('CREATE POLICY owner_manage_attempts ON "LoginAttempt" TO %I USING (true) WITH CHECK (true)', current_user);
END $$;

CREATE FUNCTION public.kairon_lookup_login(login_email TEXT)
RETURNS TABLE (id TEXT, email TEXT, name TEXT, "passwordHash" TEXT, role public."Role", blocked BOOLEAN, "sessionVersion" INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT "id", "email", "name", "passwordHash", "role", "blocked", "sessionVersion"
  FROM public."User" WHERE "email" = lower(btrim(login_email)) LIMIT 1;
$$;

-- Один атомарный UPSERT: лимит общий для всех экземпляров Vercel.
CREATE FUNCTION public.kairon_consume_login_attempt(attempt_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE attempt_count INTEGER;
BEGIN
  IF attempt_key !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF;
  DELETE FROM public."LoginAttempt" WHERE "windowStartedAt" < CURRENT_TIMESTAMP - interval '1 day';
  INSERT INTO public."LoginAttempt" ("key", "attempts", "windowStartedAt")
  VALUES (attempt_key, 1, CURRENT_TIMESTAMP)
  ON CONFLICT ("key") DO UPDATE SET
    "attempts" = CASE WHEN public."LoginAttempt"."windowStartedAt" < CURRENT_TIMESTAMP - interval '15 minutes'
      THEN 1 ELSE LEAST(public."LoginAttempt"."attempts" + 1, 1000000) END,
    "windowStartedAt" = CASE WHEN public."LoginAttempt"."windowStartedAt" < CURRENT_TIMESTAMP - interval '15 minutes'
      THEN CURRENT_TIMESTAMP ELSE public."LoginAttempt"."windowStartedAt" END
  RETURNING "attempts" INTO attempt_count;
  RETURN attempt_count <= 8;
END;
$$;

GRANT CREATE ON SCHEMA public TO kairon_auth;
ALTER FUNCTION public.kairon_lookup_login(TEXT) OWNER TO kairon_auth;
ALTER FUNCTION public.kairon_consume_login_attempt(TEXT) OWNER TO kairon_auth;
REVOKE CREATE ON SCHEMA public FROM kairon_auth;
REVOKE ALL ON FUNCTION public.kairon_lookup_login(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.kairon_consume_login_attempt(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kairon_lookup_login(TEXT) TO kairon_runtime;
GRANT EXECUTE ON FUNCTION public.kairon_consume_login_attempt(TEXT) TO kairon_runtime;
