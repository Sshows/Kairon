import Link from "next/link";
import { notFound } from "next/navigation";
import { collections } from "@/lib/collections";
import { getLesson } from "@/lib/lessons";

type Props = { params: Promise<{ source: string; id: string }> };
export function generateStaticParams() {
  return collections.map(({ source, id }) => ({ source, id }));
}
export async function generateMetadata({ params }: Props) {
  const { source, id } = await params;
  return {
    title:
      collections.find((entry) => entry.source === source && entry.id === id)
        ?.title ?? "Тема не найдена",
  };
}
export default async function CollectionPage({ params }: Props) {
  const { source, id } = await params;
  const entry = collections.find(
    (entry) => entry.source === source && entry.id === id,
  );
  if (!entry) notFound();
  return (
    <div className="page-container document-page library-detail">
      <Link href="/collections" className="back-link">
        ← Все подборки
      </Link>
      <span className="eyebrow">{entry.sourceName}</span>
      <h1>{entry.title}</h1>
      <p className="lead">{entry.summary}</p>
      <section className="study-example">
        <h2>Пример задачи</h2>
        <p>{entry.example}</p>
      </section>
      <section>
        <h2>С чем здесь разбираются</h2>
        <ul>
          {entry.topics.map((topic) => (
            <li key={topic}>{topic}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2>С чего начать на Kairon</h2>
        <p>
          Эти уроки помогают освоить часть темы на небольшом примере. Все они
          бесплатны. В маршруте по дням уже указан порядок: не нужно выбирать
          следующий урок самостоятельно.
        </p>
        <div className="study-lesson-links">
          {entry.lessonIds.map((lessonId) => (
            <Link key={lessonId} href={`/learn/${lessonId}`}>
              {getLesson(lessonId)!.title} →
            </Link>
          ))}
        </div>
      </section>
      <section className="project-source-note">
        <h2>Куда читать дальше</h2>
        <p>
          Первоисточник содержит внешние ссылки и, в отдельных разделах,
          команды. Для конкретного инструмента проверь его документацию и
          условия. Наличие ссылки в подборке само по себе не подтверждает
          качество или безопасность программы.
        </p>
        <a
          className="subtle-link"
          href={entry.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          Место в проверенной версии источника ↗
        </a>
        {"resourceUrl" in entry && (
          <a
            className="subtle-link"
            href={entry.resourceUrl as string}
            target="_blank"
            rel="noreferrer"
          >
            Открыть внешнюю подборку ↗
          </a>
        )}
        <Link className="subtle-link" href={`/sources/${entry.source}`}>
          Что именно проверено →
        </Link>
      </section>
    </div>
  );
}
