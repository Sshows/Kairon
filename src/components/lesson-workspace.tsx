"use client";

import { useState } from "react";
import Link from "next/link";
import Markdown from "react-markdown";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  Lightbulb,
  LoaderCircle,
  Monitor,
} from "lucide-react";
import type { PublicLesson } from "@/lib/lessons";
import type { learningPaths } from "@/lib/learning-paths";
import { lessonSections } from "@/lib/lesson-outline";
import { useLocalProgress } from "@/lib/local-progress";
import { PracticeFolderHelp } from "./practice-folder-help";
import { Button } from "./ui/button";

export function LessonWorkspace({
  lesson,
  path,
  previous,
  next,
  dayNumber,
  dayTitle,
  nextDay,
}: {
  lesson: PublicLesson;
  path: (typeof learningPaths)[number];
  previous: string | null;
  next: string | null;
  dayNumber: number;
  dayTitle: string;
  nextDay: number | null;
}) {
  const { completedLessonIds, storageAvailable, markComplete } =
    useLocalProgress();
  const completedHere = completedLessonIds.includes(lesson.id);
  const [answer, setAnswer] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [hint, setHint] = useState("");
  const [hintsUsed, setHintsUsed] = useState(0);
  const [passed, setPassed] = useState(false);
  const [debrief, setDebrief] = useState("");
  const [checkedSteps, setCheckedSteps] = useState<string[]>([]);
  const sections = lessonSections(lesson.theory);

  async function submit(action: "hint" | "check") {
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/learning/${lesson.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          answer,
          hintIndex: Math.min(hintsUsed, 2),
        }),
      });
      const data = await response.json();
      if (data.error) {
        setMessage(data.error);
        return;
      }
      if (data.status === "passed") {
        setPassed(true);
        setDebrief(data.debrief);
        markComplete(lesson.id);
      } else if (data.status === "hint") {
        setHintsUsed(data.hintsUsed);
        setHint(`Подсказка ${data.hintsUsed}/3: ${data.hint}`);
      } else
        setMessage(
          "Пока не совпало. Посмотри результат практики и попробуй ещё раз.",
        );
    } catch {
      setMessage(
        "Не удалось проверить ответ. Проверь соединение и попробуй ещё раз.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="guide-layout">
      <article className="lesson-theory guide-article">
        <span className="eyebrow">
          День {dayNumber} · примерно {lesson.minutes} мин
        </span>
        <h1>{lesson.title}</h1>
        <p className="guide-summary">{lesson.summary}</p>
        <div className="practice-location">
          <Monitor size={19} />
          <span>
            {path.id === "web-security"
              ? "Практика — на своём компьютере, в Windows или Kali по инструкции урока. Здесь — объяснение и самопроверка."
              : "Делай шаги в своей Kali Linux. На сайте — объяснение и самопроверка."}
          </span>
        </div>
        {completedHere && !passed && (
          <p className="program-note" role="status">
            Самопроверка этого урока уже пройдена в этом браузере. Можно
            перечитать объяснение или ещё раз проверить ответ и открыть разбор.
          </p>
        )}
        {lesson.kit && (
          <a className="guide-kit-link" href={path.kit.url} download>
            <Download size={17} />
            {path.kit.label}
          </a>
        )}
        {lesson.kit && (
          <PracticeFolderHelp
            folder={path.kit.url
              .split("/")
              .at(-1)!
              .replace(/\.zip$/, "")}
          />
        )}
        <details className="lesson-outline">
          <summary>Содержание урока</summary>
          <nav aria-label="Разделы этого урока">
            {sections
              .filter((section) => section.title)
              .map((section) => (
                <a href={`#${section.id}`} key={section.id}>
                  {section.title}
                </a>
              ))}
          </nav>
        </details>
        <div className="lesson-markdown">
          {sections.map((section) => (
            <section
              id={section.id}
              className="lesson-text-section"
              key={section.id}
            >
              <Markdown>{section.markdown}</Markdown>
            </section>
          ))}
        </div>
        <section
          className="guide-checklist"
          aria-label="Проверь результат практики"
        >
          <h2>Что должно получиться</h2>
          <p>
            Отметь то, что проверил у себя. Галочки помогают тебе и не
            отправляются на сервер.
          </p>
          {lesson.checklist.map((step) => (
            <label key={step}>
              <input
                type="checkbox"
                checked={checkedSteps.includes(step)}
                onChange={(event) =>
                  setCheckedSteps((steps) =>
                    event.target.checked
                      ? [...steps, step]
                      : steps.filter((item) => item !== step),
                  )
                }
              />
              <span>{step}</span>
            </label>
          ))}
        </section>
        <section className="guide-question" aria-label="Самопроверка">
          <span className="eyebrow">ПРОВЕРЬ, ЧТО ПОНЯЛ</span>
          <h2>{lesson.question}</h2>
          <p className="check-explanation">
            Проверяем твой ответ. Сайт не подключается к Kali и не проверяет
            действия на компьютере.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit("check");
            }}
          >
            {lesson.kind === "choice" ? (
              <fieldset className="lesson-choices">
                <legend className="sr-only">Варианты ответа</legend>
                {lesson.choices.map((choice) => (
                  <label key={choice.id}>
                    <input
                      type="radio"
                      name="lesson-answer"
                      value={choice.id}
                      checked={answer === choice.id}
                      onChange={() => setAnswer(choice.id)}
                      disabled={passed}
                    />
                    <span>{choice.text}</span>
                  </label>
                ))}
              </fieldset>
            ) : (
              <label className="local-answer">
                Твой ответ
                <input
                  value={answer}
                  maxLength={150}
                  onChange={(event) => setAnswer(event.target.value)}
                  aria-label="Ответ по результату практики"
                  autoComplete="off"
                  disabled={passed}
                  placeholder={lesson.placeholder}
                />
              </label>
            )}
            <div className="lesson-controls">
              <Button
                type="submit"
                disabled={pending || passed || !answer.trim()}
              >
                {pending ? (
                  <LoaderCircle size={16} className="spin" />
                ) : passed ? (
                  <CheckCircle2 size={16} />
                ) : null}
                {passed ? "Ответ верный" : "Проверить ответ"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void submit("hint")}
                disabled={pending || passed || hintsUsed >= 3}
              >
                <Lightbulb size={16} />
                {hintsUsed >= 3 ? "Все подсказки открыты" : "Нужна подсказка"}
              </Button>
            </div>
          </form>
          {message && (
            <p className="learning-message" role="status">
              {message}
            </p>
          )}
          {hint && (
            <p className="learning-hint" role="status">
              {hint}
            </p>
          )}
          {passed && (
            <section className="lesson-debrief" aria-live="polite">
              <h2>
                <CheckCircle2 size={20} />
                Разбор
              </h2>
              <div className="lesson-markdown">
                <Markdown>{debrief}</Markdown>
              </div>
              <strong>Самопроверка пройдена</strong>
              <p>
                {storageAvailable === false
                  ? "Браузер не разрешает сохранить отметку. Урок пройден в этой вкладке; после её закрытия результат может исчезнуть."
                  : "Отметка сохранена только в этом браузере. Она помогает продолжить обучение с нужного дня и не подтверждает выполнение действий в Kali."}
              </p>
            </section>
          )}
        </section>
        <nav className="guide-pagination" aria-label="Перейти к другому уроку">
          {previous ? (
            <Link href={`/learn/${previous}`} className="subtle-link">
              <ArrowLeft size={16} />
              Предыдущий урок
            </Link>
          ) : (
            <Link href={`/days/${dayNumber}`} className="subtle-link">
              Вернуться к дню {dayNumber}
            </Link>
          )}
          <Button
            asChild
            variant={passed || completedHere ? "default" : "outline"}
          >
            <Link
              href={
                nextDay
                  ? `/days/${nextDay}`
                  : next
                    ? `/learn/${next}`
                    : "/study-plan"
              }
            >
              {nextDay
                ? `Дальше: день ${nextDay}`
                : next
                  ? "Следующий урок"
                  : "Вернуться к плану"}
              <ArrowRight size={16} />
            </Link>
          </Button>
        </nav>
      </article>
      <aside className="guide-sidebar">
        <section className="practice-goal">
          <span className="eyebrow">ТВОЯ ЗАДАЧА</span>
          <p>{lesson.goal}</p>
          <Link href={`/days/${dayNumber}`} className="subtle-link">
            День {dayNumber}: {dayTitle}
          </Link>
        </section>
        <details className="guide-resources">
          <summary>Ссылки и источники урока</summary>
          {lesson.resources.map((resource) => (
            <a
              key={resource.url}
              href={resource.url}
              target="_blank"
              rel="noreferrer"
            >
              <span>
                {resource.label}
                <small>{resource.note}</small>
              </span>
              <ExternalLink size={16} />
            </a>
          ))}
        </details>
        {lesson.kit && (
          <details className="guide-download">
            <summary>Что входит в учебный набор</summary>
            <p>{path.kit.description}</p>
            <Link
              className="subtle-link"
              href={"/learn/" + path.kit.setupLesson}
            >
              Как открыть набор →
            </Link>
          </details>
        )}
        <Link href="/glossary" className="subtle-link">
          Непонятное слово? Словарь
          <ArrowRight size={16} />
        </Link>
      </aside>
    </div>
  );
}
