"use client";
import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

type Area = { id: string; title: string; summary: string; topics: string[] };
export function SecurityLibrary({ areas }: { areas: Area[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const needle = deferredQuery.trim().toLocaleLowerCase("ru");
  const shown = areas.filter((area) =>
    [area.title, area.summary, ...area.topics]
      .join(" ")
      .toLocaleLowerCase("ru")
      .includes(needle),
  );
  return (
    <section aria-label="Разделы справочника">
      <label className="search-box">
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          aria-label="Найти задачу или область защиты"
          placeholder="Например: журналы, файлы или сеть"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <p role="status" className="program-note">
        Показано {shown.length} из {areas.length}. Сначала прочитай задачу и
        пример; затем выбирай урок или оригинальный справочник.
      </p>
      <div className="library-grid">
        {shown.map((area) => (
          <article className="library-card" key={area.id}>
            <h2>
              <Link href={`/library/${area.id}`}>{area.title}</Link>
            </h2>
            <p>{area.summary}</p>
            <Link className="subtle-link" href={`/library/${area.id}`}>
              Пример и подходящие уроки →
            </Link>
          </article>
        ))}
      </div>
      {!shown.length && (
        <p>Ничего не нашли. Попробуй другое слово или убери поиск.</p>
      )}
    </section>
  );
}
