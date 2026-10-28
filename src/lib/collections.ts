import awesome from "../../content/source-audits/awesome-hacking.json";
import secret from "../../content/source-audits/secret-knowledge.json";

export const collectionSources = [
  { id: "awesome-hacking", name: "Awesome-Hacking", audit: awesome },
  {
    id: "secret-knowledge",
    name: "The Book of Secret Knowledge",
    audit: secret,
  },
] as const;

export const collections = collectionSources.flatMap((source) =>
  source.audit.sections.map((section) => ({
    ...section,
    source: source.id,
    sourceName: source.name,
  })),
);
