import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);
const json = (file) => JSON.parse(readFileSync(new URL(file, root), "utf8"));
const plan = json("content/day-plan.json");
assert.deepEqual(json("content/progress-index.json"), {
  days: plan.days.map(({ day, lessonIds }) => ({ day, lessonIds })),
});
const glossarySource = readFileSync(
  new URL("src/lib/glossary.ts", root),
  "utf8",
);
const definitions = [...glossarySource.matchAll(/\bru: "([^"\n]+)"/g)].map(
  (match) => match[1].slice(0, 100),
);
const probes = [
  ...definitions,
  ...plan.days
    .flatMap((day) => [day.summary, day.goal, day.outcome])
    .filter((text) => typeof text === "string" && text.length >= 60)
    .map((text) => text.slice(0, 100)),
  "Путь в командах — это папка, а не имя компьютера.",
];
const courseCatalogue = json("content/book-courses/catalogue.json");
for (const lesson of json("content/lessons/continuation.json")) {
  const paragraphs = lesson.theory
    .split(/\n\n/)
    .filter(
      (p) => p.length > 120 && !p.startsWith("#") && !p.startsWith("```"),
    );
  assert.ok(paragraphs.length, `Missing integrated lesson text: ${lesson.id}`);
  probes.push(
    paragraphs[0].slice(0, 120),
    lesson.question.slice(0, 100),
    lesson.debrief.slice(0, 100),
  );
}
for (const course of courseCatalogue.courses) {
  for (const lesson of course.lessons) {
    const text = readFileSync(
      new URL(`content/book-courses/${course.id}/${lesson.id}.md`, root),
      "utf8",
    );
    const paragraph = text
      .split(/\n\n/)
      .find(
        (p) => p.length > 120 && !p.startsWith("#") && !p.startsWith("```"),
      );
    assert.ok(paragraph, `Missing course text in ${course.id}/${lesson.id}`);
    probes.push(paragraph.slice(0, 120));
  }
}
assert.ok(
  probes.length > 60,
  "Expected representative private course content probes",
);
function scripts(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? scripts(path)
      : /\.(?:js|map)$/.test(entry.name)
        ? [path]
        : [];
  });
}
const files = scripts(fileURLToPath(new URL(".next/static", root)));
assert.ok(
  files.length > 0,
  "Build the application before checking public client files",
);
for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const probe of probes) {
    const escaped = JSON.stringify(probe).slice(1, -1);
    const unicode = escaped.replace(
      /[^\x20-\x7e]/g,
      (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
    );
    assert.ok(
      ![probe, escaped, unicode].some((value) => source.includes(value)),
      `Private course text in ${file}`,
    );
  }
}
console.log(
  `Public client content boundary: PASS (${files.length} files, ${probes.length} course text probes; ID-only progress index).`,
);
