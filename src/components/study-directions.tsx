"use client";
import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

type Direction = {
  id: string;
  title: string;
  summary: string;
  topics: string[];
};
export function StudyDirections({ directions }: { directions: Direction[] }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase("ru");
  const filtered = directions.filter((item) =>
    [item.title, item.summary, ...item.topics]
      .join(" ")
      .toLocaleLowerCase("ru")
      .includes(needle),
  );
  return (
    <section aria-label="Направления обучения" className="study-directions">
      <label className="search-box">
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          aria-label="Найти направление обучения"
          placeholder="Например: облако, сети или доступы"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <p className="program-note" role="status">
        Показано {filtered.length} из {directions.length}. Начальные уроки
        открыты на Kairon; углублённый план — по ссылкам в карточке.
      </p>
      <div className="study-direction-grid">
        {filtered.map((item) => (
          <article className="study-direction-card" key={item.id}>
            <h3>
              <Link href={`/study-plan/${item.id}`}>{item.title}</Link>
            </h3>
            <p>{item.summary}</p>
            <Link href={`/study-plan/${item.id}`} className="subtle-link">
              Пример, практика и что изучать дальше →
            </Link>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <p>
          Нет подходящего направления. Попробуй «сети», «приложения» или убери
          поиск.
        </p>
      )}
    </section>
  );
}
