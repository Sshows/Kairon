"use client";
import { useDeferredValue, useState } from "react";
import type { terms as glossaryTerms } from "@/lib/glossary";
export function Glossary({
  locale,
  terms,
}: {
  locale: "ru" | "en";
  terms: typeof glossaryTerms;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const filtered = terms.filter((item) =>
    `${item.term} ${item[locale]}`
      .toLowerCase()
      .includes(deferredQuery.trim().toLowerCase()),
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
