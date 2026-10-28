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
import studyPlan from "../content/study-plan.json";
import jassicsPlan from "../content/source-audits/jassics-plan.json";
import hamedPlan from "../content/source-audits/hamed-roadmap.json";
import malwareBible from "../content/source-audits/malware-bible.json";
import awesome from "../content/source-audits/awesome-hacking.json";
import secret from "../content/source-audits/secret-knowledge.json";
import paulCatalog from "../content/source-audits/paul-cybersecurity.json";
import { directionLessons } from "../src/lib/study-plan";
import { isUnlocked } from "../src/lib/learning";

describe("Kali guides and answer checks", () => {
  it("publishes six independent courses with stable lesson IDs", () => {
    expect(lessons).toHaveLength(68);
    const kali = getCourseLessons("from-zero");
    const company = getCourseLessons("blue-team");
    const projects = getCourseLessons("kali-tools");
    const basics = getCourseLessons("security-basics");
    const diagnostics = getCourseLessons("diagnostics");
    expect(diagnostics).toHaveLength(8);
    expect(getCourseModules("diagnostics")).toHaveLength(2);
    expect(diagnostics.reduce((sum, lesson) => sum + lesson.xp, 0)).toBe(800);
    const analysis = getCourseLessons("file-analysis");
    expect(kali).toHaveLength(20);
    expect(company).toHaveLength(12);
    expect(projects).toHaveLength(8);
    expect(basics).toHaveLength(12);
    expect(analysis).toHaveLength(8);
    expect(getCourseModules("from-zero")).toHaveLength(4);
    expect(getCourseModules("blue-team")).toHaveLength(3);
    expect(getCourseModules("kali-tools")).toHaveLength(2);
    expect(getCourseModules("security-basics")).toHaveLength(3);
    expect(getCourseModules("file-analysis")).toHaveLength(2);
    expect(new Set(lessons.map((lesson) => lesson.id)).size).toBe(68);
    expect(kali.reduce((sum, lesson) => sum + lesson.xp, 0)).toBe(2130);
    expect(company.reduce((sum, lesson) => sum + lesson.xp, 0)).toBe(1360);
    expect(projects.reduce((sum, lesson) => sum + lesson.xp, 0)).toBe(900);
    expect(basics.reduce((sum, lesson) => sum + lesson.xp, 0)).toBe(1200);
    expect(analysis.reduce((sum, lesson) => sum + lesson.xp, 0)).toBe(800);
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
    expect(isUnlocked("diag-intake", new Set())).toBe(true);
    expect(isUnlocked("diag-scope", new Set(["analysis-intake"]))).toBe(false);
    expect(isUnlocked("diag-scope", new Set(["diag-intake"]))).toBe(true);
    expect(isUnlocked("analysis-intake", new Set())).toBe(true);
    expect(
      isUnlocked(
        "analysis-filetype",
        new Set(["basics-cia", "soc-first-shift"]),
      ),
    ).toBe(false);
    expect(isUnlocked("analysis-filetype", new Set(["analysis-intake"]))).toBe(
      true,
    );
    expect(isUnlocked("basics-cia", new Set())).toBe(true);
    expect(
      isUnlocked("basics-risk", new Set(["project-start", "soc-first-shift"])),
    ).toBe(false);
    expect(isUnlocked("basics-risk", new Set(["basics-cia"]))).toBe(true);
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
  it("connects every learning stage and direction to valid published lessons", () => {
    expect(studyPlan.stages).toHaveLength(8);
    expect(jassicsPlan.sections).toHaveLength(25);
    expect(hamedPlan.sections).toHaveLength(21);
    const publishedIds = new Set(lessons.map((lesson) => lesson.id));
    for (const stage of studyPlan.stages)
      for (const id of stage.lessons)
        expect(publishedIds.has(id), stage.id + ": " + id).toBe(true);
    expect(new Set(Object.keys(directionLessons))).toEqual(
      new Set(jassicsPlan.sections.map((section) => section.id)),
    );
    for (const ids of Object.values(directionLessons))
      for (const id of ids) expect(publishedIds.has(id), id).toBe(true);
    for (const source of [jassicsPlan, hamedPlan])
      for (const section of source.sections)
        expect(section.sourceUrl).toContain(source.commit);
  });
  it("distinguishes source chapters from placeholders and connects library areas", () => {
    expect(malwareBible.commit).toBe(
      "2d1381b164dc43c23c93e447fd6a30ab3ccc118f",
    );
    expect(paulCatalog.commit).toBe("4e2d6e6138dc8ec5eb67cb04619f905b52619532");
    expect(malwareBible.sections).toHaveLength(25);
    expect(
      malwareBible.sections.filter(
        (section) => section.status === "placeholder",
      ),
    ).toHaveLength(6);
    expect(paulCatalog.sections).toHaveLength(21);
    const ids = new Set(lessons.map((lesson) => lesson.id));
    for (const area of paulCatalog.sections) {
      expect(area.example.length, area.id).toBeGreaterThan(30);
      for (const lessonId of area.lessonIds)
        expect(ids.has(lessonId), area.id + ": " + lessonId).toBe(true);
    }
    for (const source of [malwareBible, paulCatalog]) {
      expect(new Set(source.sections.map((section) => section.id)).size).toBe(
        source.sections.length,
      );
      for (const section of source.sections)
        expect(section.sourceUrl).toContain(source.commit);
    }
  });
  it("maps all entries from both new sources to pinned references and valid lessons", () => {
    expect(awesome.sections).toHaveLength(81);
    expect(secret.sections).toHaveLength(15);
    expect(awesome.commit).toBe("440486fd08b0a0d9ad9a041a0bb234dcdf65dee2");
    expect(secret.commit).toBe("7d37069a361d3fd9f214480755f7969744e866fa");
    const ids = new Set(lessons.map((lesson) => lesson.id));
    for (const source of [awesome, secret]) {
      expect(new Set(source.sections.map((section) => section.id)).size).toBe(
        source.sections.length,
      );
      for (const section of source.sections) {
        expect(section.sourceUrl, section.id).toContain(source.commit);
        expect(section.example.length, section.id).toBeGreaterThan(50);
        expect(section.lessonIds.length, section.id).toBeGreaterThan(0);
        for (const id of section.lessonIds)
          expect(ids.has(id), section.id + ": " + id).toBe(true);
      }
    }
    for (const section of awesome.sections)
      expect(section.resourceUrl).toMatch(/^https:\/\//);
  });
});
