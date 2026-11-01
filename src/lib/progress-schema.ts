import { z } from "zod";
import plan from "../../content/day-plan.json";
const allowedIds = new Set(plan.days.flatMap((day) => day.lessonIds));
const lessonId = z.string().refine((id) => allowedIds.has(id));
const day = z.number().int().min(1).max(plan.days.length);
const identity = { accountId: z.uuid() };
export const progressRequestSchema = z
  .discriminatedUnion("action", [
    z.strictObject({ ...identity, action: z.literal("lesson"), lessonId }),
    z.strictObject({
      ...identity,
      action: z.literal("day"),
      day,
      complete: z.boolean(),
    }),
    z.strictObject({
      ...identity,
      action: z.literal("bookmark"),
      day,
      lessonId: lessonId.nullable(),
      note: z.string().trim().max(1000),
    }),
    z.strictObject({ ...identity, action: z.literal("clear-bookmark") }),
    z.strictObject({ ...identity, action: z.literal("reset") }),
    z.strictObject({
      ...identity,
      action: z.literal("import"),
      lessonIds: z.array(lessonId).max(106),
    }),
  ])
  .refine(
    (data) =>
      data.action !== "bookmark" ||
      data.lessonId === null ||
      plan.days
        .find((item) => item.day === data.day)
        ?.lessonIds.includes(data.lessonId),
    "Урок не относится к выбранному дню.",
  );

export type AccountProgress = {
  completedLessonIds: string[];
  completedDays: number[];
  bookmark: {
    day: number;
    lessonId: string | null;
    note: string;
    updatedAt: string;
  } | null;
};
export const emptyAccountProgress: AccountProgress = {
  completedLessonIds: [],
  completedDays: [],
  bookmark: null,
};
export { allowedIds };
