import { describe, expect, it } from "vitest";
import { checkLesson } from "../src/lib/lesson-checks";
import { lessons, publicLesson, courseModules } from "../src/lib/lessons";
import { isUnlocked } from "../src/lib/learning";

describe("Kali guides and answer checks", () => {
  it("publishes twenty independent guides across four levels", () => {
    expect(lessons).toHaveLength(20);
    expect(courseModules).toHaveLength(4);
    expect(new Set(lessons.map((lesson) => lesson.id)).size).toBe(20);
    expect(lessons.reduce((sum, lesson) => sum + lesson.xp, 0)).toBe(2130);
    for (const lesson of lessons) {
      expect(lesson.theory.length, lesson.id).toBeGreaterThan(1000);
      expect(lesson.checklist).toHaveLength(3);
      expect(lesson.hints).toHaveLength(3);
      expect(lesson.resources.length).toBeGreaterThan(0);
      expect(lesson.theory).not.toContain("тренажёр");
    }
  });
  it("accepts observations from practice, normalizes case, and rejects unrelated answers", () => {
    expect(checkLesson("lab-files", "  KLR-READY-2026  ")).toBe(true);
    expect(checkLesson("local-web", "200    OK")).toBe(true);
    expect(checkLesson("login-investigation", "198.51.100.23")).toBe(true);
    expect(checkLesson("final-case", "198.51.100.23")).toBe(false);
    expect(checkLesson("unknown", "200")).toBe(false);
    expect(checkLesson("find-port", "closed")).toBe(false);
    for (const lesson of lessons)
      for (const answer of lesson.answers)
        expect(checkLesson(lesson.id, answer), lesson.id).toBe(true);
  });
  it("does not expose answers, hints or debrief through lesson props", () => {
    for (const lesson of lessons) {
      const visible = publicLesson(lesson);
      expect(visible).not.toHaveProperty("answers");
      expect(visible).not.toHaveProperty("hints");
      expect(visible).not.toHaveProperty("debrief");
    }
  });
  it("requires the current course prerequisites, never retired lesson IDs", () => {
    expect(isUnlocked("kali-install", new Set())).toBe(true);
    expect(
      isUnlocked("kali-first-boot", new Set(["permission", "where-am-i"])),
    ).toBe(false);
    expect(isUnlocked("kali-first-boot", new Set(["kali-install"]))).toBe(true);
    expect(isUnlocked("permission", new Set())).toBe(false);
    expect(
      isUnlocked(
        "final-case",
        new Set(lessons.slice(0, -1).map((lesson) => lesson.id)),
      ),
    ).toBe(true);
  });
});
