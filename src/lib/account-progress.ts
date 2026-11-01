import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { withUser } from "@/lib/db";
import { allowedIds, type AccountProgress } from "@/lib/progress-schema";

export async function readProgress(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<AccountProgress> {
  const [lessons, days, bookmark] = await Promise.all([
    tx.lessonProgress.findMany({
      where: { userId, completedAt: { not: null } },
      select: { lessonId: true },
      orderBy: { lessonId: "asc" },
    }),
    tx.studyDayProgress.findMany({
      where: { userId },
      select: { day: true },
      orderBy: { day: "asc" },
    }),
    tx.studyBookmark.findUnique({ where: { userId } }),
  ]);
  return {
    completedLessonIds: lessons
      .map((row) => row.lessonId)
      .filter((id) => allowedIds.has(id)),
    completedDays: days.map((row) => row.day),
    bookmark: bookmark
      ? {
          day: bookmark.day,
          lessonId: bookmark.lessonId,
          note: bookmark.note,
          updatedAt: bookmark.updatedAt.toISOString(),
        }
      : null,
  };
}
export function getAccountProgress(userId: string) {
  return withUser(userId, (tx) => readProgress(tx, userId));
}
