"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import type catalog from "../../content/project-catalog.json";
import { projectLevels, guidedProjects } from "@/lib/project-guides";

type Project = Pick<
  (typeof catalog.projects)[number],
  | "id"
  | "title"
  | "originalTitle"
  | "summary"
  | "why"
  | "level"
  | "implementation"
>;

export function ProjectCatalog({ projects }: { projects: Project[] }) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const [status, setStatus] = useState("all");
  const needle = query.toLocaleLowerCase("ru").trim();
  const visible = projects.filter(
    (project) =>
      (level === "all" || level === project.level) &&
      (status === "all" || status === project.implementation) &&
      `${project.title} ${project.originalTitle} ${project.summary} ${project.why}`
        .toLocaleLowerCase("ru")
        .includes(needle),
  );
  return (
    <section aria-label="Каталог проектов">
      <div className="project-filters">
        <label className="project-search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Найти проект</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Например: файлы, DNS или Python"
          />
        </label>
        <label>
          Уровень
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value)}
          >
            <option value="all">Все уровни</option>
            {Object.entries(projectLevels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Что есть у автора
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">Все проекты</option>
            <option value="source">Есть папка с кодом</option>
            <option value="idea">Описание идеи</option>
          </select>
        </label>
      </div>
      <p className="program-note" role="status">
        Показано {visible.length} из {projects.length}. Карточка содержит
        объяснение, план и ссылки; пошаговые уроки Kairon отмечены отдельно.
      </p>
      <div className="project-grid">
        {visible.map((project) => (
          <article className="project-card" key={project.id}>
            <div className="project-card-tags">
              <span>{projectLevels[project.level]}</span>
              <span>
                {project.implementation === "source"
                  ? "У автора есть код"
                  : "Идея проекта"}
              </span>
            </div>
            <h2>
              <Link href={`/projects/${project.id}`}>{project.title}</Link>
            </h2>
            <p className="project-original">{project.originalTitle}</p>
            <p>{project.summary}</p>
            {guidedProjects[project.id] && (
              <Link
                className="project-guided"
                href={`/learn/${guidedProjects[project.id]}`}
              >
                Есть простой урок Kairon →
              </Link>
            )}
            <Link className="subtle-link" href={`/projects/${project.id}`}>
              Объяснение и план <ArrowRight size={16} />
            </Link>
          </article>
        ))}
      </div>
      {!visible.length && (
        <div className="empty-state">
          <p>
            Такого проекта не нашли. Попробуй другое слово или убери фильтры.
          </p>
          <button
            type="button"
            className="subtle-link"
            onClick={() => {
              setQuery("");
              setLevel("all");
              setStatus("all");
            }}
          >
            Показать все проекты
          </button>
        </div>
      )}
    </section>
  );
}
