import { describe, expect, it } from "vitest";
import { checkLesson } from "../src/lib/lesson-checks";
import {
  lessons,
  publicLesson,
  getCourseLessons,
  getCourseModules,
} from "../src/lib/lessons";
import audit from "../content/source-audits/pocket-hacker.json";
import catalogue from "../content/project-catalog.json";
import { isUnlocked } from "../src/lib/learning";

describe("Kali guides and answer checks", () => {
  it("publishes twenty independent guides across four levels", () => {
    expect(lessons).toHaveLength(40);
    const kali = getCourseLessons("from-zero");
    const company = getCourseLessons("blue-team");
    const projects = getCourseLessons("kali-tools");
    expect(kali).toHaveLength(20);
    expect(company).toHaveLength(12);
    expect(projects).toHaveLength(8);
    expect(getCourseModules("from-zero")).toHaveLength(4);
    expect(getCourseModules("blue-team")).toHaveLength(3);
    expect(getCourseModules("kali-tools")).toHaveLength(2);
    expect(new Set(lessons.map((lesson) => lesson.id)).size).toBe(40);
    expect(kali.reduce((sum, lesson) => sum + lesson.xp, 0)).toBe(2130);
    expect(company.reduce((sum, lesson) => sum + lesson.xp, 0)).toBe(1360);
    expect(projects.reduce((sum, lesson) => sum + lesson.xp, 0)).toBe(900);
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
        new Set(
          getCourseLessons("from-zero")
            .slice(0, -1)
            .map((lesson) => lesson.id),
        ),
      ),
    ).toBe(true);
    expect(isUnlocked("soc-first-shift", new Set())).toBe(true);
    expect(isUnlocked("project-start", new Set())).toBe(true);
    expect(
      isUnlocked("project-hash", new Set(["soc-first-shift", "kali-install"])),
    ).toBe(false);
    expect(isUnlocked("project-hash", new Set(["project-start"]))).toBe(true);
    expect(isUnlocked("soc-login-chain", new Set(["kali-install"]))).toBe(
      false,
    );
    expect(isUnlocked("soc-login-chain", new Set(["soc-first-shift"]))).toBe(
      true,
    );
    expect(
      isUnlocked(
        "company-final-case",
        new Set(getCourseLessons("from-zero").map((lesson) => lesson.id)),
      ),
    ).toBe(false);
    expect(
      isUnlocked(
        "company-final-case",
        new Set(
          getCourseLessons("blue-team")
            .slice(0, -1)
            .map((lesson) => lesson.id),
        ),
      ),
    ).toBe(true);
  });
  it("records all public source IDs without mirroring channel message bodies", () => {
    expect(audit.public_post_count).toBe(258);
    expect(audit.posts).toHaveLength(258);
    expect(new Set(audit.posts.map((post) => post.id)).size).toBe(258);
    expect(audit.reached_public_history_start).toBe(true);
    expect(audit.readable_text_posts + audit.media_only_posts).toBe(258);
    for (const post of audit.posts) expect(post).not.toHaveProperty("text");
    for (const lesson of getCourseLessons("blue-team"))
      expect(
        lesson.resources.some((source) =>
          source.url.startsWith("https://t.me/PocketHackerOne/"),
        ),
      ).toBe(true);
  });
  it("covers every source project and distinguishes code from proposals", () => {
    expect(catalogue.source.commit).toBe(
      "6a9989cd4858d4c51f0922debcba53668121bea1",
    );
    expect(catalogue.projects).toHaveLength(69);
    expect(new Set(catalogue.projects.map((project) => project.id)).size).toBe(
      69,
    );
    expect(
      catalogue.projects.filter(
        (project) => project.implementation === "source",
      ),
    ).toHaveLength(43);
    expect(
      catalogue.projects.filter((project) => project.implementation === "idea"),
    ).toHaveLength(26);
    for (const project of catalogue.projects) {
      expect(project.summary.length, project.id).toBeGreaterThan(30);
      expect(project.steps.length, project.id).toBeGreaterThanOrEqual(4);
      expect(project.prerequisites.length, project.id).toBeGreaterThan(0);
      expect(project.sourceUrl).toContain(catalogue.source.commit);
    }
  });
});
