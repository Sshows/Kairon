"use client";

import { memo, type ReactNode } from "react";
import Markdown from "react-markdown";
import {
  lessonSections,
  lessonSectionKind,
  lessonSteps,
} from "@/lib/lesson-outline";

export const LessonReading = memo(function LessonReading({
  theory,
  goal,
  folderVisual,
}: {
  theory: string;
  goal: string;
  folderVisual: ReactNode;
}) {
  const sections = lessonSections(theory);
  const action = sections.find(
    ({ title }) => lessonSectionKind(title) === "action",
  );
  const explanation = sections.find(
    ({ title }) => lessonSectionKind(title) === "explanation",
  );

  function reveal(id: string) {
    const element = document.getElementById(id);
    if (element instanceof HTMLDetailsElement) element.open = true;
  }

  function markdown(source: string) {
    return (
      <Markdown
        components={{
          p: ({ children, node }) =>
            node?.children.some(
              (child) => child.type === "element" && child.tagName === "img",
            ) ? (
              <div>{children}</div>
            ) : (
              <p>{children}</p>
            ),
          img: ({ src, alt }) =>
            src === "#folder-terminal" && folderVisual ? (
              folderVisual
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={typeof src === "string" ? src : undefined}
                alt={alt ?? ""}
                loading="lazy"
                decoding="async"
                fetchPriority="low"
              />
            ),
        }}
      >
        {source}
      </Markdown>
    );
  }

  return (
    <>
      <aside className="lesson-start" aria-label="Задача этого урока">
        <span className="eyebrow">Результат урока</span>
        <p>{goal}</p>
        {action && (
          <div className="lesson-reading-links">
            <a href={`#${action.id}`}>Перейти к действиям</a>
            {explanation && (
              <a
                href={`#${explanation.id}`}
                onClick={() => reveal(explanation.id)}
              >
                Открыть объяснение
              </a>
            )}
          </div>
        )}
        {explanation && (
          <p className="lesson-start-hint">
            Сначала выполни шаг и сравни результат. Разделы «Почему это
            работает» раскрываются по нажатию — к ним можно вернуться в любой
            момент.
          </p>
        )}
      </aside>
      <details className="lesson-outline">
        <summary>Содержание урока</summary>
        <nav aria-label="Разделы этого урока">
          {sections
            .filter(({ title }) => title)
            .map((section) => (
              <a
                href={`#${section.id}`}
                onClick={() => reveal(section.id)}
                key={section.id}
              >
                {section.title.replace(/`/g, "")}
              </a>
            ))}
        </nav>
      </details>
      <div className="lesson-markdown">
        {sections.map((section) => {
          const kind = lessonSectionKind(section.title);
          if (kind === "explanation")
            return (
              <details
                id={section.id}
                className="lesson-explanation lesson-text-section"
                key={section.id}
              >
                <summary>
                  <h2>{section.title.replace(/`/g, "")}</h2>
                  <span>Нажми, чтобы прочитать подробное объяснение</span>
                </summary>
                <div className="lesson-explanation-body">
                  {markdown(section.markdown.replace(/^##[^\n]*\n?/, ""))}
                </div>
              </details>
            );
          return (
            <section
              id={section.id}
              className={`lesson-text-section${kind === "action" ? " lesson-action-section" : ""}`}
              key={section.id}
            >
              {lessonSteps(section.markdown).map((part, index) => (
                <div
                  className={
                    /^###\s+/.test(part) ? "lesson-action-step" : undefined
                  }
                  key={index}
                >
                  {markdown(part)}
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
});
