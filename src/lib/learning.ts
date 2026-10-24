import "server-only";
import { randomUUID } from "node:crypto";
import { withUser } from "./db";
import { lessons } from "./lessons";
export async function getProgress(userId: string) {
  return withUser(userId, (tx) =>
    tx.lessonProgress.findMany({
      where: { userId },
      select: {
        lessonId: true,
        completedAt: true,
        awardedXp: true,
        hintsUsed: true,
      },
    }),
  );
}
export function isUnlocked(lessonId: string, completed: Set<string>) {
  const index = lessons.findIndex((l) => l.id === lessonId);
  return (
    index >= 0 && lessons.slice(0, index).every((l) => completed.has(l.id))
  );
}
export async function updateLearning(
  userId: string,
  lessonId: string,
  action: "hint" | "check",
  correct: boolean,
) {
  const lesson = lessons.find((l) => l.id === lessonId);
  if (!lesson) throw new Error("Unknown lesson");
  return withUser(userId, async (tx) => {
    // Сериализация по ученику: параллельные проверки не открывают уроки раньше времени и не удваивают XP.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`;
    const all = await tx.lessonProgress.findMany({ where: { userId } });
    if (
      !isUnlocked(
        lessonId,
        new Set(all.filter((p) => p.completedAt).map((p) => p.lessonId)),
      )
    )
      return { status: "locked" as const };
    const row =
      all.find((p) => p.lessonId === lessonId) ??
      (await tx.lessonProgress.create({
        data: { id: randomUUID(), userId, lessonId },
      }));
    if (row.completedAt)
      return { status: "passed" as const, xp: row.awardedXp, already: true };
    if (action === "hint") {
      const hintsUsed = Math.min(3, row.hintsUsed + 1);
      await tx.lessonProgress.update({
        where: { id: row.id },
        data: { hintsUsed },
      });
      return {
        status: "hint" as const,
        hint: lesson.hints[hintsUsed - 1],
        hintsUsed,
      };
    }
    const fresh = Date.now() - row.attemptWindow.getTime() > 60000;
    if (!fresh && row.attemptCount >= 20) return { status: "limited" as const };
    const now = new Date();
    const xp = Math.max(10, lesson.xp - row.hintsUsed * 10);
    await tx.lessonProgress.update({
      where: { id: row.id },
      data: {
        attemptCount: fresh ? 1 : row.attemptCount + 1,
        attemptWindow: fresh ? now : row.attemptWindow,
        ...(correct ? { completedAt: now, awardedXp: xp } : {}),
      },
    });
    if (correct)
      await tx.auditLog.create({
        data: { userId, action: `LESSON_COMPLETED:${lessonId}` },
      });
    return correct
      ? { status: "passed" as const, xp, already: false }
      : { status: "failed" as const };
  });
}
