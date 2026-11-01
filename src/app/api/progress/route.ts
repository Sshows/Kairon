import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/access";
import { withUser } from "@/lib/db";
import { readProgress } from "@/lib/account-progress";
import { progressRequestSchema } from "@/lib/progress-schema";
import {
  privateJson,
  accountFailure,
  InputError,
  readAccountInput,
} from "@/lib/account-http";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const input = progressRequestSchema.safeParse(
      await readAccountInput(request),
    );
    if (!input.success)
      throw new InputError(
        "Не удалось сохранить: проверьте день, урок и длину заметки.",
        400,
      );
    const user = await getCurrentUser();
    if (!user)
      throw new InputError(
        "Войдите снова, чтобы сохранить изменения в аккаунте.",
        401,
      );
    const data = input.data;
    // A stale tab from user A must not write its data after user B signs in.
    // This field is only a guard: the session remains the source of authority.
    if (data.accountId !== user.id)
      throw new InputError(
        "В другой вкладке сменился аккаунт. Обновите страницу перед сохранением.",
        409,
      );
    const progress = await withUser(user.id, async (tx) => {
      if (data.action === "lesson" || data.action === "import") {
        const ids =
          data.action === "lesson"
            ? [data.lessonId]
            : [...new Set(data.lessonIds)];
        if (ids.length > 0) {
          await tx.$executeRaw`
            INSERT INTO public."LessonProgress" ("id", "userId", "lessonId", "completedAt", "updatedAt")
            SELECT gen_random_uuid()::text, ${user.id}, item, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            FROM unnest(${ids}::text[]) AS item
            ON CONFLICT ("userId", "lessonId")
            DO UPDATE SET
              "completedAt" = COALESCE(public."LessonProgress"."completedAt", EXCLUDED."completedAt"),
              "updatedAt" = CURRENT_TIMESTAMP
          `;
        }
      } else if (data.action === "day") {
        if (data.complete)
          await tx.studyDayProgress.upsert({
            where: { userId_day: { userId: user.id, day: data.day } },
            create: { userId: user.id, day: data.day },
            update: {},
          });
        else
          await tx.studyDayProgress.deleteMany({
            where: { userId: user.id, day: data.day },
          });
      } else if (data.action === "bookmark") {
        const values = {
          day: data.day,
          lessonId: data.lessonId,
          note: data.note,
        };
        await tx.studyBookmark.upsert({
          where: { userId: user.id },
          create: { userId: user.id, ...values },
          update: values,
        });
      } else if (data.action === "clear-bookmark") {
        await tx.studyBookmark.deleteMany({ where: { userId: user.id } });
      } else {
        await tx.lessonProgress.updateMany({
          where: { userId: user.id },
          data: { completedAt: null },
        });
        await tx.studyDayProgress.deleteMany({ where: { userId: user.id } });
      }
      return readProgress(tx, user.id);
    });
    return privateJson({ accountId: user.id, progress });
  } catch (error) {
    return accountFailure(error);
  }
}
