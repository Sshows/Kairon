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
import webJuice from "../../content/lessons/web-juice.json";
import webDefense from "../../content/lessons/web-defense.json";
import type { LearningPathId } from "./learning-paths";
export const lessons = [
  ...[...webJuice, ...webDefense].map((lesson) => ({
    ...lesson,
    pathId: "web-security" as LearningPathId,
  })),
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

const lessonById = new Map<string, Lesson>();
const lessonsByPath = new Map<string, Lesson[]>();
const modulesByPath = new Map<string, string[]>();

for (const lesson of lessons) {
  lessonById.set(lesson.id, lesson);
  const pathList = lessonsByPath.get(lesson.pathId);
  if (pathList) {
    pathList.push(lesson);
  } else {
    lessonsByPath.set(lesson.pathId, [lesson]);
  }
}

for (const [pathId, pathLessons] of lessonsByPath.entries()) {
  modulesByPath.set(
    pathId,
    [...new Set(pathLessons.map((lesson) => lesson.module))],
  );
}

export function getLesson(id: string) {
  return lessonById.get(id);
}
export function publicLesson(lesson: Lesson) {
  const { hints, debrief, answers, xp, ...visible } = lesson;
  void hints;
  void debrief;
  void answers;
  void xp;
  return visible;
}
export type PublicLesson = ReturnType<typeof publicLesson>;
export function getCourseLessons(pathId: string) {
  return lessonsByPath.get(pathId) ?? [];
}
export function getCourseModules(pathId: string) {
  return modulesByPath.get(pathId) ?? [];
}
export const lessonIds = new Set(lessonById.keys());
