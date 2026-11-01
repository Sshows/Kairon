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
export const bookConnections: Record<string, string> = {
  "tools-hashcat": "security-language",
  "basics-https": "security-language",
  "basics-ports": "security-language",
  "project-start": "automation",
  "project-log": "automation",
  "project-hash": "automation",
  "company-idor-evidence": "bug-bounty",
  "web-idor": "bug-bounty",
  "web-xss": "bug-bounty",
  "tools-hash": "cryptography",
  "tools-hmac": "cryptography",
  "tools-openssl": "cryptography",
  "analysis-intake": "malware",
  "analysis-strings": "malware",
  "analysis-report": "malware",
  "tools-file": "zero-day",
  "tools-readelf": "zero-day",
};
