import "server-only";
import plan from "../../content/day-plan.json";

// Course descriptions are sent as props only after the page checks the account.
export const dayPlan = plan;
export const learningDays = plan.days;
export const learningStages = plan.stages;
export const totalDays = plan.totalDays;
export const totalPlannedMinutes = plan.totalMinutes;
export type LearningDay = (typeof learningDays)[number];
export type LearningStage = (typeof learningStages)[number];

const dayByNumber = new Map<number, LearningDay>();
const dayByLessonId = new Map<string, LearningDay>();
const stageById = new Map<string, LearningStage>();

for (const entry of learningDays) {
  dayByNumber.set(entry.day, entry);
  for (const lessonId of entry.lessonIds) {
    dayByLessonId.set(lessonId, entry);
  }
}

for (const stage of learningStages) {
  stageById.set(stage.id, stage);
}

export const orderedLessonIds = Object.freeze(
  learningDays.flatMap((entry) => entry.lessonIds),
);

export function getLearningDay(day: number) {
  if (!Number.isInteger(day)) return undefined;
  return dayByNumber.get(day);
}

export function getLessonDay(lessonId: string) {
  return dayByLessonId.get(lessonId);
}

export function getLearningStage(stageId: string) {
  return stageById.get(stageId);
}
