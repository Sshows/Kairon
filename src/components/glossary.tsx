"use client";
import { useState } from "react";
import { terms } from "@/lib/glossary";
export function Glossary({ locale }: { locale: "ru" | "en" }) {
  const [query, setQuery] = useState("");
  const filtered = terms.filter((item) =>
    `${item.term} ${item[locale]}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <input
        className="glossary-filter"
        type="search"
        aria-label={locale === "ru" ? "Найти термин" : "Find a term"}
        placeholder={
          locale === "ru" ? "Например, RLS или фишинг" : "Try RLS or phishing"
        }
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="glossary-list">
        {filtered.map((item) => (
          <details key={item.term}>
            <summary>{item.term}</summary>
            <p>{item[locale]}</p>
            <p>
              <strong>
                {locale === "ru" ? "Как в жизни: " : "Everyday example: "}
              </strong>
              {locale === "ru" ? item.exampleRu : item.exampleEn}
            </p>
          </details>
        ))}
        {filtered.length === 0 && (
          <p role="status">
            {locale === "ru" ? "Термин не найден." : "No terms found."}
          </p>
        )}
      </div>
    </>
  );
}
