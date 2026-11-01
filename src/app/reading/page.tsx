import Link from "next/link";
import { requireUser } from "@/lib/access";
import { bookCourses } from "@/lib/book-courses";
export const metadata = { title: "Продолжение обучения: книги и практика" };
export default async function ReadingPage() {
  await requireUser();
  return (
    <div className="page-container document-page reading-index">
      <Link className="back-link" href="/study-plan">
        ← План по дням
      </Link>
      <span className="eyebrow">СЛЕДУЮЩИЙ ШАГ ПОСЛЕ ОСНОВ</span>
      <h1>Разобраться глубже и сделать свой проект</h1>
      <p className="lead">
        Здесь продолжаются темы базового курса. Выбери одно направление и
        проходи занятия внутри него по порядку. Перед началом каждого
        направления указаны уроки, которые помогут подготовиться.
      </p>
      <p>
        В каждом разборе есть объяснение механизма, действия в своей Kali,
        ожидаемый результат и вопросы для самостоятельного вывода. Книги служат
        источниками и ориентиром для дальнейшего чтения; PDF скачивать для
        выполнения этих заданий не требуется.
      </p>
      <div className="reading-grid">
        {bookCourses.map((course, index) => (
          <article className="reading-card" key={course.id}>
            <span className="eyebrow">
              НАПРАВЛЕНИЕ {index + 1} · {course.lessons.length} ЗАНЯТИЯ
            </span>
            <h2>
              <Link href={`/reading/${course.id}`}>{course.title}</Link>
            </h2>
            <p>{course.description}</p>
            <p className="reading-source">Источник: {course.book.title}</p>
            <Link className="subtle-link" href={`/reading/${course.id}`}>
              Подготовиться и начать →
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
