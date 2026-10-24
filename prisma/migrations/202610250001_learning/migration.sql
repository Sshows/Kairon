CREATE TABLE "LessonProgress" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "lessonId" TEXT NOT NULL,
  "completedAt" TIMESTAMPTZ(3),
  "awardedXp" INTEGER NOT NULL DEFAULT 0 CHECK ("awardedXp" >= 0),
  "hintsUsed" INTEGER NOT NULL DEFAULT 0 CHECK ("hintsUsed" BETWEEN 0 AND 3),
  "attemptCount" INTEGER NOT NULL DEFAULT 0 CHECK ("attemptCount" >= 0),
  "attemptWindow" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "LessonProgress_userId_lessonId_key" ON "LessonProgress"("userId", "lessonId");
CREATE INDEX "LessonProgress_userId_completedAt_idx" ON "LessonProgress"("userId", "completedAt");
ALTER TABLE "LessonProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LessonProgress" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON "LessonProgress" TO kairon_runtime;
CREATE POLICY learning_own ON "LessonProgress" TO kairon_runtime
  USING ("userId" = nullif(current_setting('app.user_id', true), ''))
  WITH CHECK ("userId" = nullif(current_setting('app.user_id', true), ''));
DO $$ BEGIN
  EXECUTE format('CREATE POLICY owner_manage_learning ON "LessonProgress" TO %I USING (true) WITH CHECK (true)', current_user);
END $$;
