import { describe, expect, it } from "vitest";
import catalogue from "../content/continuation/catalogue.json";
import books from "../content/book-courses/catalogue.json";
import progressIndex from "../content/progress-index.json";
import { getLesson, publicLesson } from "../src/lib/lessons";
import { getLessonDay } from "../src/lib/day-plan";
import { readBookLesson } from "../src/lib/book-courses";
import { progressRequestSchema } from "../src/lib/progress-schema";

describe("book material in the ordinary daily route", () => {
  it("retains all fourteen full explanations and their checks in canonical lessons", async () => {
    const original = books.courses.flatMap((c) =>
      c.lessons.map((l) => ({ course: c.id, lesson: l })),
    );
    expect(original).toHaveLength(14);
    for (const { course, lesson } of original) {
      const integrated = getLesson(lesson.id)!;
      expect(integrated.theory).toContain(
        (await readBookLesson(course, lesson.id))!.trim(),
      );
      expect(integrated.question).toBe(lesson.check.question);
      expect(integrated.answers).toEqual([lesson.check.answer]);
      expect(getLessonDay(lesson.id)!.day).toBeGreaterThan(60);
    }
  });
  it("adds forty-five explained practices and places the 59 lessons in the agreed order", () => {
    expect(catalogue).toHaveLength(59);
    expect(catalogue.filter((e) => !("course" in e))).toHaveLength(45);
    const continuation = progressIndex.days.filter((d) => d.day > 60);
    expect(continuation).toHaveLength(34);
    expect(continuation.flatMap((d) => d.lessonIds)).toEqual(
      catalogue.map((e) => e.id),
    );
    expect(getLessonDay("john-ripper")!.day).toBe(61);
    expect(getLessonDay("bug-race-oauth-logic")!.day).toBe(70);
    expect(getLessonDay("crypto-public-key-pqc")!.day).toBe(73);
    expect(getLessonDay("source-sink")!.day).toBe(76);
    expect(getLessonDay("pwn-linux-shell-globbing")!.day).toBe(77);
    expect(getLessonDay("pwn-software-format-file-structs")!.day).toBe(82);
    expect(getLessonDay("pwn-linux-processes-signals")!.day).toBe(83);
    expect(getLessonDay("pwn-windows-pe-tokens-acl")!.day).toBe(88);
    expect(getLessonDay("pwn-shell-expansion-restrictions")!.day).toBe(89);
    expect(getLessonDay("pwn-kernel-creds-modprobe-hardening")!.day).toBe(94);
    for (const item of catalogue) {
      const lesson = getLesson(item.id)!;
      expect(lesson.theory.length, item.id).toBeGreaterThan(4500);
      expect(lesson.theory).not.toContain("<!-- preparation -->");
      expect(lesson.choices.some((c) => c.id === lesson.answers[0])).toBe(true);
      expect(publicLesson(lesson)).not.toHaveProperty("answers");
    }
  });
  it("accepts new bookmarks and all 165 IDs but rejects unpublished days and mismatched lessons", () => {
    const accountId = "8af17b2d-3d08-466f-9d61-35e480b26c84";
    const bookmark = {
      accountId,
      action: "bookmark",
      day: 94,
      lessonId: "pwn-kernel-creds-modprobe-hardening",
      note: "Проверить кэш cred_jar и маску Capabilities",
    };
    expect(progressRequestSchema.safeParse(bookmark).success).toBe(true);
    for (const change of [
      { day: 95 },
      { day: 365 },
      { day: 0 },
      { day: 75 },
      { lessonId: "kali-install" },
    ])
      expect(
        progressRequestSchema.safeParse({ ...bookmark, ...change }).success,
      ).toBe(false);
    const lessonIds = progressIndex.days.flatMap((d) => d.lessonIds);
    expect(lessonIds).toHaveLength(165);
    expect(
      progressRequestSchema.safeParse({
        accountId,
        action: "import",
        lessonIds,
      }).success,
    ).toBe(true);
    expect(
      progressRequestSchema.safeParse({
        accountId,
        action: "import",
        lessonIds: [...lessonIds, lessonIds[0]],
      }).success,
    ).toBe(false);
  });
});
