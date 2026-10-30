"use client";
import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

type Tool = { id: string; name: string; summary: string; howItWorks: string };
export function ToolboxIndex({ tools }: { tools: Tool[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const needle = deferredQuery.trim().toLocaleLowerCase("ru");
  const shown = tools.filter((tool) =>
    [tool.name, tool.summary, tool.howItWorks]
      .join(" ")
      .toLocaleLowerCase("ru")
      .includes(needle),
  );
  return (
    <section aria-label="Инструменты и их устройство">
      <label className="search-box">
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          aria-label="Найти инструмент Kali"
          placeholder="Например: Nmap, пароль или шифрование"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <p className="program-note" role="status">
        Показано {shown.length} из {tools.length}. Внутри — принцип работы,
        пример и объяснение команд.
      </p>
      <div className="library-grid">
        {shown.map((tool) => (
          <article className="tool-card" key={tool.id}>
            <h2>
              <Link href={`/toolbox/${tool.id}`}>{tool.name}</Link>
            </h2>
            <p>{tool.summary}</p>
            <Link className="subtle-link" href={`/toolbox/${tool.id}`}>
              Как работает и как пользоваться →
            </Link>
          </article>
        ))}
      </div>
      {!shown.length && <p>Попробуй название инструмента или другую задачу.</p>}
    </section>
  );
}
