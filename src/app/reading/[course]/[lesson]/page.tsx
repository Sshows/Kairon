import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/access";
import {
  getBookCourse,
  getBookLesson,
  readBookLesson,
} from "@/lib/book-courses";
import { lessonSections } from "@/lib/lesson-outline";
type Props = { params: Promise<{ course: string; lesson: string }> };
export async function generateMetadata({ params }: Props) {
  await requireUser();
  const p = await params;
  return {
    title: getBookLesson(p.course, p.lesson)?.title ?? "Занятие не найдено",
  };
}
export default async function ReadingLesson({ params }: Props) {
  await requireUser();
  const p = await params;
  const course = getBookCourse(p.course),
    lesson = getBookLesson(p.course, p.lesson);
  if (!course || !lesson) notFound();
  const text = await readBookLesson(p.course, p.lesson);
  if (!text) notFound();
  const sections = lessonSections(text);
  const index = course.lessons.findIndex((item) => item.id === lesson.id);
  const next = course.lessons[index + 1];
  return (
    <div className="page-container document-page reading-lesson">
      <Link className="back-link" href={`/reading/${course.id}`}>
        ← {course.title}
      </Link>
      <span className="eyebrow">
        ЗАНЯТИЕ {index + 1} ИЗ {course.lessons.length} · ОКОЛО {lesson.minutes}{" "}
        МИНУТ
      </span>
      <h1>{lesson.title}</h1>
      <p className="lead">{lesson.summary}</p>
      <details className="lesson-outline" open>
        <summary>Содержание занятия</summary>
        <nav aria-label="Разделы занятия">
          {sections
            .filter((s) => s.title)
            .map((s) => (
              <a key={s.id} href={`#${s.id}`}>
                {s.title}
              </a>
            ))}
        </nav>
      </details>
      <article className="lesson-markdown">
        {sections.map((s) => (
          <section id={s.id} key={s.id}>
            <Markdown remarkPlugins={[remarkGfm]} skipHtml>
              {s.markdown}
            </Markdown>
          </section>
        ))}
      </article>
      <section className="reading-panel">
        <h2>Проверь своё объяснение</h2>
        <p>{lesson.check.question}</p>
        <ul>
          {lesson.check.choices.map((choice) => (
            <li key={choice.id}>
              {choice.id.toUpperCase()}. {choice.text}
            </li>
          ))}
        </ul>
        <p>
          Выбери вариант и сначала объясни причину своими словами. Затем раскрой
          разбор. Эта проверка помогает разобраться в теме; отметку основного
          курса она не меняет.
        </p>
        <details>
          <summary>Показать ответ и объяснение</summary>
          <p>
            <strong>Вариант {lesson.check.answer.toUpperCase()}.</strong>{" "}
            {lesson.check.explanation}
          </p>
        </details>
      </section>
      <section className="reading-sources">
        <h2>На какие главы опирается занятие</h2>
        <p>{course.book.title}</p>
        <ul>
          {lesson.sources.map((s) => (
            <li key={s.chapter}>
              {s.chapter} ·{" "}
              {s.pages.startsWith("https://") ? (
                <a href={s.pages} target="_blank" rel="noreferrer">
                  Официальная справка
                </a>
              ) : (
                s.pages
              )}
            </li>
          ))}
        </ul>
        {course.book.pdfPages > 0 && (
          <p>
            Для PDF указаны номера страниц файла, а не печатная нумерация книги.
          </p>
        )}
      </section>
      <nav className="reading-next" aria-label="Порядок чтения">
        {index > 0 && (
          <Link href={`/reading/${course.id}/${course.lessons[index - 1].id}`}>
            ← Предыдущее занятие
          </Link>
        )}
        <Link href={next ? `/reading/${course.id}/${next.id}` : "/reading"}>
          {next ? `Дальше: ${next.title} →` : "Выбрать следующее направление →"}
        </Link>
      </nav>
    </div>
  );
}
