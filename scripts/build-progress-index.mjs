import { readFileSync, writeFileSync } from "node:fs";
const plan = JSON.parse(
  readFileSync(new URL("../content/day-plan.json", import.meta.url), "utf8"),
);
// Only stable identifiers are needed by legacy progress validation in the browser.
// Never put course titles, explanations or exercises in this public index.
const index = {
  days: plan.days.map(({ day, lessonIds }) => ({ day, lessonIds })),
};
writeFileSync(
  new URL("../content/progress-index.json", import.meta.url),
  JSON.stringify(index, null, 2) + "\n",
);
