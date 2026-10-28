import { describe, expect, it } from "vitest";
import { lessonSections } from "../src/lib/lesson-outline";

describe("lesson contents navigation", () => {
  it("keeps code comments inside fenced examples rather than turning them into lesson sections", () => {
    const markdown =
      "An introduction\n## Prepare\n~~~bash\n## a code comment\ncat file.txt\n~~~\n## Read the output\nA result\n";
    const sections = lessonSections(markdown);
    expect(sections.map((section) => section.title)).toEqual([
      "",
      "Prepare",
      "Read the output",
    ]);
    expect(sections[1].markdown).toContain("## a code comment");
    expect(sections.map((section) => section.markdown).join("")).toBe(markdown);
    expect(new Set(sections.map((section) => section.id)).size).toBe(
      sections.length,
    );
  });
  it("assigns different anchors to repeated titles and leaves shorter fence characters in code", () => {
    const sections = lessonSections(
      "## Example\n````text\n```\n## inside code\n````\n## Example\nnext",
    );
    expect(sections.map((section) => section.title)).toEqual([
      "Example",
      "Example",
    ]);
    expect(sections[0].id).not.toBe(sections[1].id);
    expect(sections[0].markdown).toContain("## inside code");
  });
});
