import plan from "../../content/day-plan.json";

// Contains only route descriptions and public IDs; no answers or account data.
// It can be imported by the browser's local progress helpers.
export const dayPlan = plan;
export const learningDays = plan.days;
export const learningStages = plan.stages;
export const totalDays = plan.totalDays;
export const totalPlannedMinutes = plan.totalMinutes;
export type LearningDay = (typeof learningDays)[number];
export type LearningStage = (typeof learningStages)[number];

export function getLearningDay(day: number) {
  if (!Number.isInteger(day)) return undefined;
  return learningDays.find((entry) => entry.day === day);
}

export function getLessonDay(lessonId: string) {
  return learningDays.find((entry) => entry.lessonIds.includes(lessonId));
}

export function getLearningStage(stageId: string) {
  return learningStages.find((entry) => entry.id === stageId);
}
