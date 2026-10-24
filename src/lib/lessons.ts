import "server-only";
import data from "../../content/lessons/start.json";
export type Lesson = (typeof data)[number];
export const lessons: Lesson[] = data;
export function getLesson(id: string) {
  return lessons.find((l) => l.id === id);
}
export function publicLesson(lesson: Lesson) {
  const { hints, debrief, ...visible } = lesson;
  void hints;
  void debrief;
  return visible;
}
export type PublicLesson = ReturnType<typeof publicLesson>;
