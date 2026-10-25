import "server-only";
import data from "../../content/lessons/kali.json";
export type Lesson = (typeof data)[number];
export const lessons: Lesson[] = data;
export function getLesson(id: string) {
  return lessons.find((l) => l.id === id);
}
export function publicLesson(lesson: Lesson) {
  const { hints, debrief, answers, ...visible } = lesson;
  void hints;
  void debrief;
  void answers;
  return visible;
}
export type PublicLesson = ReturnType<typeof publicLesson>;
export const courseModules = [
  ...new Set(lessons.map((lesson) => lesson.module)),
];
export const lessonIds = new Set(lessons.map((lesson) => lesson.id));
