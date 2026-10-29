"use client";
import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

type Topic = {
  id: string;
  title: string;
  originalTitle: string;
  summary: string;
  example: string;
  source: string;
  sourceName: string;
};
export function WebTopicCatalog({ topics }: { topics: Topic[] }) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("");
  const needle = query.trim().toLocaleLowerCase("ru");
  const sources = [
    ...new Map(topics.map((topic) => [topic.source, topic.sourceName])),
  ];
  const shown = topics.filter(
    (topic) =>
      (!source || topic.source === source) &&
      [topic.title, topic.originalTitle, topic.summary, topic.example]
        .join(" ")
        .toLocaleLowerCase("ru")
        .includes(needle),
  );
  return (
    <section aria-label="Темы веб-безопасности" id="catalog">
      <h2>Найди тему и открой объяснение</h2>
      <div className="collection-filters">
        <label className="search-box">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            aria-label="Найти тему веб-безопасности"
            placeholder="Например: пароль, XSS, cookie или Docker"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="collection-source-filter">
          Источник
          <select
            aria-label="Источник веб-материалов"
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            <option value="">Все три проекта</option>
            {sources.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="program-note" role="status">
        Показано {shown.length} из {topics.length} тем.
      </p>
      <div className="library-grid">
        {shown.map((topic) => (
          <article
            className="web-topic-card collection-card"
            key={topic.source + "/" + topic.id}
          >
            <span className="eyebrow">{topic.sourceName}</span>
            <h3>
              <Link href={`/web-labs/${topic.source}/${topic.id}`}>
                {topic.title}
              </Link>
            </h3>
            <p>{topic.summary}</p>
            <Link
              className="subtle-link"
              href={`/web-labs/${topic.source}/${topic.id}`}
            >
              Объяснение, пример и материалы →
            </Link>
          </article>
        ))}
      </div>
      {!shown.length && (
        <p>Темы не найдены. Попробуй другое слово или выбери все проекты.</p>
      )}
    </section>
  );
}
