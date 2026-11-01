import { expect, test } from "vitest";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import files from "../content/material-files.json";

test("every private material is listed exactly once and has no public static copy", () => {
  function list(directory: string, prefix = ""): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const key = prefix + entry.name;
      return entry.isDirectory()
        ? list(join(directory, entry.name), key + "/")
        : [key];
    });
  }
  expect(files.length).toBe(new Set(files).size);
  expect(list("private-materials").sort()).toEqual([...files].sort());
  for (const file of files)
    expect(existsSync(join("public", file)), file).toBe(false);
});
