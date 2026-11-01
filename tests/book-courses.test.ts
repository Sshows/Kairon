import { describe, expect, it } from "vitest";
import {
  bookCourses,
  getBookCourse,
  getBookLesson,
  readBookLesson,
} from "../src/lib/book-courses";
import { getLesson } from "../src/lib/lessons";
import { lessonSections } from "../src/lib/lesson-outline";

describe("detailed follow-on reading", () => {
  it("resolves actual course text, existing prerequisites, sources and valid explanations", async () => {
    expect(new Set(bookCourses.map((c) => c.id)).size).toBe(bookCourses.length);
    for (const course of bookCourses) {
      for (const prerequisite of course.prerequisites) {
        expect(
          getLesson(prerequisite.href.replace("/learn/", "")),
          prerequisite.href,
        ).toBeDefined();
      }
      for (const lesson of course.lessons) {
        const text = (await readBookLesson(course.id, lesson.id))!;
        expect(text).toContain("## ");
        const sections = lessonSections(text);
        expect(new Set(sections.map((s) => s.id)).size).toBe(sections.length);
        expect(
          lesson.check.choices.some((c) => c.id === lesson.check.answer),
        ).toBe(true);
        expect(lesson.sources.length).toBeGreaterThan(0);
      }
    }
  });
  it("rejects unknown and traversal-like file selection and labels the supplied sample honestly", async () => {
    expect(getBookCourse("../malware")).toBeUndefined();
    expect(getBookLesson("malware", "../../README")).toBeUndefined();
    expect(await readBookLesson("malware", "../../README")).toBeUndefined();
    expect(getBookCourse("zero-day")!.book.providedScope).toContain(
      "Sample Chapter",
    );
    expect(getBookCourse("zero-day")!.book.pdfPages).toBe(38);
  });
});
