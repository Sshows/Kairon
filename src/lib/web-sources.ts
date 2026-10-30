import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import juice from "../../content/source-audits/juice-shop.json";
import hacker from "../../content/source-audits/hacker101.json";
import cheats from "../../content/source-audits/cheat-sheets.json";

export type WebTopic = {
  id: string;
  title: string;
  originalTitle: string;
  sourceUrl: string;
  summary: string;
  example: string;
  lessonIds: string[];
  license?: string;
  filename?: string;
  sha256?: string;
  status?: string;
  officialUrl?: string;
};
export type WebSource = {
  source: {
    name: string;
    repo: string;
    url: string;
    commit: string;
    license: string;
    licenseUrl: string;
    reviewedAt: string;
    scope: string;
    limitations: string[];
  };
  sections: WebTopic[];
};

export const webSources: { id: string; audit: WebSource }[] = [
  { id: "juice-shop", audit: juice },
  { id: "hacker101", audit: hacker },
  { id: "cheat-sheets", audit: cheats },
];
export const webTopics = webSources.flatMap(({ id, audit }) =>
  audit.sections.map((entry) => ({
    ...entry,
    source: id,
    sourceName: audit.source.name,
  })),
);

const webSourceById = new Map(webSources.map((source) => [source.id, source]));
const cheatSheetCache = new Map<string, Promise<string>>();

export function getWebSource(id: string) {
  return webSourceById.get(id);
}

export async function getCheatSheet(entry: WebTopic) {
  // Only filenames present in the audited catalogue can reach the filesystem.
  const prefix = `https://github.com/OWASP/CheatSheetSeries/blob/${cheats.source.commit}/cheatsheets/`;
  if (!entry.sourceUrl.startsWith(prefix))
    throw new Error("Unexpected source path");
  const filename = decodeURIComponent(
    entry.sourceUrl.slice(prefix.length).split("#")[0],
  );
  if (!/^[A-Za-z0-9_.+-]+\.md$/.test(filename))
    throw new Error("Unexpected filename");
  let cached = cheatSheetCache.get(filename);
  if (!cached) {
    cached = readFile(
      join(process.cwd(), "content", "web-originals", "cheat-sheets", filename),
      "utf8",
    );
    cheatSheetCache.set(filename, cached);
  }
  return cached;
}
