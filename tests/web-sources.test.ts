import { describe, it, expect } from "vitest";
import { readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { getCheatSheet, webSources, webTopics } from "../src/lib/web-sources";
import { lessonIds } from "../src/lib/lessons";

describe("Complete source catalogue and licensed originals", () => {
  it("connects every audited topic to a pinned source and published explanation", async () => {
    for (const { audit } of webSources) {
      expect(audit.source.commit).toMatch(/^[a-f0-9]{40}$/);
      expect(audit.source.licenseUrl).toMatch(/^https:\/\//);
      expect(new Set(audit.sections.map((entry) => entry.id)).size).toBe(
        audit.sections.length,
      );
      for (const entry of audit.sections) {
        expect(entry.sourceUrl, entry.id).toContain(audit.source.commit);
        expect(entry.summary.length, entry.id).toBeGreaterThan(60);
        expect(entry.example.length, entry.id).toBeGreaterThan(60);
        for (const id of entry.lessonIds)
          expect(lessonIds.has(id), id).toBe(true);
      }
    }
    const cheats = webSources.find((source) => source.id === "cheat-sheets")!;
    const filenames = (
      await readdir("content/web-originals/cheat-sheets")
    ).filter(
      (filename) => filename.endsWith(".md") && filename !== "LICENSE.md",
    );
    expect(cheats.audit.sections).toHaveLength(filenames.length);
    for (const entry of cheats.audit.sections) {
      const text = await getCheatSheet(entry);
      expect(text.length, entry.id).toBeGreaterThan(50);
      expect(createHash("sha256").update(text).digest("hex"), entry.id).toBe(
        entry.sha256,
      );
    }
    expect(webTopics.length).toBeGreaterThan(200);
  });
  it("rejects filesystem paths outside audited filenames", async () => {
    const entry = webTopics.find((topic) => topic.source === "cheat-sheets")!;
    await expect(
      getCheatSheet({
        ...entry,
        sourceUrl: entry.sourceUrl.replace(/\/[^/]+$/, "/..%2Fpackage.json"),
      }),
    ).rejects.toThrow();
    await expect(
      getCheatSheet({
        ...entry,
        sourceUrl: "https://example.com/untrusted.md",
      }),
    ).rejects.toThrow();
  });
});
