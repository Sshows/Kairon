import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import catalogue from "../../content/book-courses/catalogue.json";

export const bookCourses = catalogue.courses;
export function getBookCourse(id: string) {
  return bookCourses.find((course) => course.id === id);
}
export function getBookLesson(courseId: string, lessonId: string) {
  return getBookCourse(courseId)?.lessons.find(
    (lesson) => lesson.id === lessonId,
  );
}
export async function readBookLesson(courseId: string, lessonId: string) {
  const lesson = getBookLesson(courseId, lessonId);
  if (!lesson) return undefined;
  // Both path components come from the repository-owned catalogue.
  if (!/^[a-z0-9-]+$/.test(courseId) || !/^[a-z0-9-]+$/.test(lesson.id))
    throw new Error("Invalid reading catalogue");
  return readFile(
    join(process.cwd(), "content", "book-courses", courseId, lesson.id + ".md"),
    "utf8",
  );
}
