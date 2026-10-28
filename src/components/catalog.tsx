"use client";
import { useState } from "react";
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
  const [category, setCategory] = useState("all");
  const filtered = paths.filter(
    (path) =>
      (category === "all" || path.category === category) &&
      [
        path.title[locale],
        path.description[locale],
        ...path.tags,
        ...path.modules[locale],
      ]
        .join(" ")
        .toLocaleLowerCase(locale)
        .includes(query.trim().toLocaleLowerCase(locale)),
  );
  return (
    <section id="paths" className="catalog-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">LEARNING PATHS</span>
          <h2>
            {t.catalog}
            <span className="count-badge">
              {String(paths.length).padStart(2, "0")}
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
      <div className="filters" aria-label={t.paths}>
        {(["all", "beginner", "offensive", "defensive", "ai"] as const).map(
          (key) => (
            <button
              key={key}
              className={category === key ? "filter active" : "filter"}
              aria-pressed={category === key}
              onClick={() => setCategory(key)}
            >
              {t[key]}
            </button>
          ),
        )}
      </div>
      <p className="program-note">{t.programNote}</p>
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
                <span>PATH {path.number}</span>
                <span className="draft-dot" />
                {path.availableLessons
                  ? locale === "ru"
                    ? "Можно начать"
                    : "Start learning"
                  : t.planned}
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
                  {path.availableLessons ?? path.modules[locale].length}{" "}
                  {path.availableLessons
                    ? locale === "ru"
                      ? "уроков с практикой"
                      : "practice lessons (RU)"
                    : locale === "ru"
                      ? "тем в программе"
                      : "planned topics"}
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
                setCategory("all");
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
