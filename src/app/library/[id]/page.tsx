import Link from "next/link";
import { notFound } from "next/navigation";
import paul from "../../../../content/source-audits/paul-cybersecurity.json";
import { getLesson } from "@/lib/lessons";

export function generateStaticParams() {
  return paul.sections.map(({ id }) => ({ id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return {
    title:
      paul.sections.find((area) => area.id === id)?.title ?? "Раздел не найден",
  };
}
export default async function LibraryArea({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const area = paul.sections.find((item) => item.id === id);
  if (!area) notFound();
  return (
    <div className="page-container document-page library-detail">
      <Link href="/library" className="back-link">
        ← Все области защиты
      </Link>
      <span className="eyebrow">ВЫБИРАЕМ ПОДХОД К ЗАДАЧЕ</span>
      <h1>{area.title}</h1>
      <p className="lead">{area.summary}</p>
      <section className="study-example">
        <h2>Пример</h2>
        <p>{area.example}</p>
      </section>
      <section>
        <h2>Какие вопросы здесь решают</h2>
        <ul>
          {area.topics.map((topic) => (
            <li key={topic}>{topic}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Что можно попробовать на Kairon</h2>
        <p>
          Начни с небольшого случая, результат которого можешь объяснить. Чтение
          доступно без входа; для сохранения XP уроки внутри своего пути идут
          последовательно.
        </p>
        <div className="study-lesson-links">
          {area.lessonIds.map((lessonId) => (
            <Link key={lessonId} href={`/learn/${lessonId}`}>
              {getLesson(lessonId)!.title} →
            </Link>
          ))}
        </div>
      </section>
      <section className="project-source-note">
        <h2>Оригинальный раздел</h2>
        <p>
          Источник тем — paulveillard/cybersecurity. Продукты из внешнего списка
          не установлены в Kairon, их текущие цены и возможности здесь не
          подтверждаются. Выбирай конкретную программу после понимания задачи и
          её требований.
        </p>
        <a
          className="subtle-link"
          href={area.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          Открыть проверенную версию источника ↗
        </a>
        <Link className="subtle-link" href="/sources/paul-cybersecurity">
          Что именно проверили →
        </Link>
      </section>
    </div>
  );
}
