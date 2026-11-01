import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { withUser } from "@/lib/db";
import { allowedIds, type AccountProgress } from "@/lib/progress-schema";

type RawProgressRow = {
  completedLessonIds: string[] | null;
  completedDays: number[] | null;
  day: number | null;
  lessonId: string | null;
  note: string | null;
  updatedAt: Date | string | null;
};

export async function readProgress(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<AccountProgress> {
  const rows = await tx.$queryRaw<RawProgressRow[]>`
    SELECT
      COALESCE(
        ARRAY(
          SELECT "lessonId"
          FROM public."LessonProgress"
          WHERE "userId" = ${userId} AND "completedAt" IS NOT NULL
          ORDER BY "lessonId" ASC
        ),
        ARRAY[]::text[]
      ) AS "completedLessonIds",
      COALESCE(
        ARRAY(
          SELECT day
          FROM public."StudyDayProgress"
          WHERE "userId" = ${userId}
          ORDER BY day ASC
        ),
        ARRAY[]::integer[]
      ) AS "completedDays",
      b.day AS day,
      b."lessonId" AS "lessonId",
      b.note AS note,
      b."updatedAt" AS "updatedAt"
    FROM (SELECT 1) AS single_row
    LEFT JOIN public."StudyBookmark" b ON b."userId" = ${userId}
  `;
  const row = rows[0];
  return {
    completedLessonIds: (row?.completedLessonIds ?? []).filter((id) =>
      allowedIds.has(id),
    ),
    completedDays: (row?.completedDays ?? []).map(Number),
    bookmark:
      row && row.day !== null && row.updatedAt !== null
        ? {
            day: Number(row.day),
            lessonId: row.lessonId,
            note: row.note ?? "",
            updatedAt: new Date(row.updatedAt).toISOString(),
          }
        : null,
  };
}
export function getAccountProgress(userId: string) {
  return withUser(userId, (tx) => readProgress(tx, userId));
}
