"use client";
import { useDeferredValue, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BrainCircuit,
  Search,
  Shield,
  Target,
  Terminal,
  Wrench,
  ArrowRight,
} from "lucide-react";
import { paths } from "@/lib/curriculum";
import { copy, type Locale } from "@/lib/i18n-client";
const icons = {
  terminal: Terminal,
  target: Target,
  shield: Shield,
  tool: Wrench,
  brain: BrainCircuit,
};
export function Catalog({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const available = paths.filter((path) => path.availableLessons);
  const filtered = available.filter((path) =>
    [
      path.title[locale],
      path.description[locale],
      ...path.tags,
      ...path.modules[locale],
    ]
      .join(" ")
      .toLocaleLowerCase(locale)
      .includes(deferredQuery.trim().toLocaleLowerCase(locale)),
  );
  return (
    <section id="paths" className="catalog-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            {locale === "ru" ? "СПРАВОЧНИК ПО ТЕМАМ" : "TOPIC REFERENCE"}
          </span>
          <h2>
            {t.catalog}
            <span className="count-badge">
              {String(available.length).padStart(2, "0")}
            </span>
          </h2>
        </div>
        <label className="search-box">
          <Search size={17} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search}
            aria-label={t.search}
          />
        </label>
      </div>
      <p className="program-note">{t.programNote}</p>
      <Link href="/study-plan" className="subtle-link">
        {locale === "ru"
          ? "Вернуться к маршруту по дням"
          : "Return to the daily route"}{" "}
        →
      </Link>
      <div className="path-grid">
        {filtered.map((path) => {
          const Icon = icons[path.icon];
          return (
            <Link
              key={path.slug}
              href={`/paths/${path.slug}`}
              className={`path-card ${path.color}`}
            >
              <div className="path-card-top">
                <span className="path-icon">
                  <Icon size={25} strokeWidth={1.6} />
                </span>
                <span className="path-number">/{path.number}</span>
              </div>
              <div className="path-meta">
                <span>
                  {locale === "ru" ? "ОГЛАВЛЕНИЕ РАЗДЕЛА" : "SECTION CONTENTS"}
                </span>
              </div>
              <h3>{path.title[locale]}</h3>
              <p>{path.description[locale]}</p>
              <div className="path-tags">
                {path.tags.slice(0, 3).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <div className="path-bottom">
                <span>
                  {path.availableLessons}{" "}
                  {locale === "ru"
                    ? "уроков с практикой"
                    : "practice lessons (RU)"}
                </span>
                <span className="path-open">
                  <ArrowUpRight size={19} />
                </span>
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <div className="empty-search">
            <Search size={25} />
            <p>{t.noResults}</p>
            <button
              onClick={() => {
                setQuery("");
              }}
            >
              {t.reset}
              <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
