"use client";
import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

type Entry = {
  id: string;
  source: string;
  sourceName: string;
  title: string;
  summary: string;
  example: string;
  sourceHeading: string;
  topics: string[];
};
export function KnowledgeCollections({ entries }: { entries: Entry[] }) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("");
  const deferredQuery = useDeferredValue(query);
  const needle = deferredQuery.trim().toLocaleLowerCase("ru");
  const sources = [
    ...new Map(entries.map((entry) => [entry.source, entry.sourceName])),
  ];
  const shown = entries.filter(
    (entry) =>
      (!source || source === entry.source) &&
      [
        entry.title,
        entry.sourceHeading,
        entry.summary,
        entry.example,
        ...entry.topics,
      ]
        .join(" ")
        .toLocaleLowerCase("ru")
        .includes(needle),
  );
  return (
    <section aria-label="Подборки знаний">
      <div className="collection-filters">
        <label className="search-box">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            aria-label="Найти тему в подборках"
            placeholder="Например: DNS, журналы или Android"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="collection-source-filter">
          Источник
          <select
            aria-label="Источник"
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            <option value="">Оба источника</option>
            {sources.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p role="status" className="program-note">
        Показано {shown.length} из {entries.length}. Открой тему: внутри
        объяснение, пример и подходящие уроки.
      </p>
      <div className="library-grid">
        {shown.map((entry) => (
          <article
            className="collection-card"
            key={entry.source + "/" + entry.id}
          >
            <span className="eyebrow">{entry.sourceName}</span>
            <h2>
              <Link href={`/collections/${entry.source}/${entry.id}`}>
                {entry.title}
              </Link>
            </h2>
            <p>{entry.summary}</p>
            <Link
              className="subtle-link"
              href={`/collections/${entry.source}/${entry.id}`}
            >
              Задача, пример и следующий шаг →
            </Link>
          </article>
        ))}
      </div>
      {!shown.length && (
        <p>Ничего не нашли. Попробуй другое слово или выбери оба источника.</p>
      )}
    </section>
  );
}
