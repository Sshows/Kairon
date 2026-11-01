import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/access";
import { getBookCourse } from "@/lib/book-courses";
type Props = { params: Promise<{ course: string }> };
export async function generateMetadata({ params }: Props) {
  await requireUser();
  return {
    title:
      getBookCourse((await params).course)?.title ?? "Направление не найдено",
  };
}
export default async function BookCourse({ params }: Props) {
  await requireUser();
  const course = getBookCourse((await params).course);
  if (!course) notFound();
  return (
    <div className="page-container document-page reading-course">
      <Link className="back-link" href="/reading">
        ← Все направления
      </Link>
      <span className="eyebrow">ОТ ОБЪЯСНЕНИЯ К СОБСТВЕННОЙ ПРАКТИКЕ</span>
      <h1>{course.title}</h1>
      <p className="lead">{course.description}</p>
      <section className="reading-panel">
        <h2>Что нужно знать перед началом</h2>
        <p>
          Если тема знакома, переходи к первому занятию. Если встречаешь
          незнакомые слова, сначала открой подготовительные уроки:
        </p>
        <ul>
          {course.prerequisites.map((p) => (
            <li key={p.href}>
              <Link href={p.href}>{p.label}</Link>
            </li>
          ))}
        </ul>
      </section>
      <h2>Порядок занятий</h2>
      <ol className="reading-lessons">
        {course.lessons.map((lesson) => (
          <li key={lesson.id}>
            <h3>
              <Link href={`/reading/${course.id}/${lesson.id}`}>
                {lesson.title}
              </Link>
            </h3>
            <p>{lesson.summary}</p>
            <p className="reading-source">
              Ориентир: {lesson.minutes} минут, включая практику. Можно
              разделить на несколько вечеров.
            </p>
            <Link
              className="subtle-link"
              href={`/reading/${course.id}/${lesson.id}`}
            >
              Открыть полный разбор →
            </Link>
          </li>
        ))}
      </ol>
      <section className="reading-panel">
        <h2>Книга и границы этого разбора</h2>
        <p>
          <a href={course.book.officialUrl} target="_blank" rel="noreferrer">
            {course.book.title}
          </a>{" "}
          · {course.book.authors.join(", ")} · {course.book.edition}
        </p>
        <p>{course.book.providedScope}</p>
        <p>{course.book.reviewedScope}</p>
        <p>
          Ниже показано, как темы источника связаны с занятиями. Для подробного
          разбора конкретной темы начинай с нужного занятия выше.
        </p>
        <details>
          <summary>Карта тем источника</summary>
          <ul>
            {course.book.chapters.map((chapter) => (
              <li key={chapter.chapter}>
                <strong>
                  {chapter.chapter}. {chapter.title}.
                </strong>{" "}
                {chapter.connection}
              </li>
            ))}
          </ul>
        </details>
      </section>
    </div>
  );
}
