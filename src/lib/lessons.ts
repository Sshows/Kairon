import "server-only";
import kali from "../../content/lessons/kali.json";
import company from "../../content/lessons/company.json";
import projects from "../../content/lessons/projects.json";
import basics from "../../content/lessons/basics.json";
import analysis from "../../content/lessons/analysis.json";
import diagnostics from "../../content/lessons/diagnostics.json";
import toolsNetwork from "../../content/lessons/kali-practice-network.json";
import toolsCrypto from "../../content/lessons/kali-practice-crypto.json";
import toolsExtraNetwork from "../../content/lessons/kali-practice-extra-network.json";
import toolsExtraFiles from "../../content/lessons/kali-practice-extra-files.json";
import type { LearningPathId } from "./learning-paths";
export const lessons = [
  ...basics.map((lesson) => ({
    ...lesson,
    pathId: "security-basics" as LearningPathId,
  })),
  ...kali.map((lesson) => ({
    ...lesson,
    pathId: "from-zero" as LearningPathId,
  })),
  ...company.map((lesson) => ({
    ...lesson,
    pathId: "blue-team" as LearningPathId,
  })),
  ...projects.map((lesson) => ({
    ...lesson,
    pathId: "kali-tools" as LearningPathId,
  })),
  ...analysis.map((lesson) => ({
    ...lesson,
    pathId: "file-analysis" as LearningPathId,
  })),
  ...diagnostics.map((lesson) => ({
    ...lesson,
    pathId: "diagnostics" as LearningPathId,
  })),
  ...[
    ...toolsNetwork,
    ...toolsCrypto,
    ...toolsExtraNetwork,
    ...toolsExtraFiles,
  ].map((lesson) => ({
    ...lesson,
    pathId: "kali-practice" as LearningPathId,
  })),
];
export type Lesson = (typeof lessons)[number];
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
export function getCourseLessons(pathId: string) {
  return lessons.filter((lesson) => lesson.pathId === pathId);
}
export function getCourseModules(pathId: string) {
  return [...new Set(getCourseLessons(pathId).map((lesson) => lesson.module))];
}
export const lessonIds = new Set(lessons.map((lesson) => lesson.id));
