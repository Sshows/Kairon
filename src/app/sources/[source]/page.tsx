import Link from "next/link";
import { notFound } from "next/navigation";
import { getWebSource, webSources } from "@/lib/web-sources";
import { JuiceChallenges } from "@/components/juice-challenges";

type Props = { params: Promise<{ source: string }> };
export function generateStaticParams() {
  return webSources.map(({ id }) => ({ source: id }));
}
export async function generateMetadata({ params }: Props) {
  const project = getWebSource((await params).source);
  return {
    title: project
      ? "Материалы: " + project.audit.source.name
      : "Источник не найден",
  };
}
export default async function WebSourcePage({ params }: Props) {
  const { source } = await params;
  const project = getWebSource(source);
  if (!project) notFound();
  const { audit } = project;
  return (
    <div className="page-container document-page source-detail">
      <Link href="/web-labs" className="back-link">
        ← Веб-безопасность с нуля
      </Link>
      <span className="eyebrow">ПРОВЕРЕННЫЙ ИСТОЧНИК</span>
      <h1>{audit.source.name}</h1>
      <p className="lead">{audit.source.scope}</p>
      <p>
        <a href={audit.source.url} target="_blank" rel="noreferrer">
          {audit.source.repo} — оригинальный репозиторий ↗
        </a>
      </p>
      <p className="program-note">
        Проверено {audit.source.reviewedAt}. Версия{" "}
        <code>{audit.source.commit}</code>.
      </p>
      <section>
        <h2>Лицензия и использование</h2>
        <p>
          {audit.source.license}.{" "}
          <a href={audit.source.licenseUrl} target="_blank" rel="noreferrer">
            Условия у авторов ↗
          </a>
        </p>
        <p>
          {source === "cheat-sheets"
            ? "Полные тексты шпаргалок доступны внутри Kairon на английском с указанием авторов и лицензии CC BY-SA 4.0. Русские вводные примеры написаны отдельно. Это справочник; изучение основ начинается в подробных уроках курса."
            : "Объяснения и упражнения Kairon написаны отдельно. Видео, иллюстрации и книгу не копируем: ссылки ведут к авторам. Для практики Juice Shop используется собственная локальная копия официального приложения."}
        </p>
      </section>
      <section>
        <h2>Содержание: {audit.sections.length} тем</h2>
        <div className="reference-source-grid">
          {audit.sections.map((topic) => (
            <article key={topic.id}>
              <h3>
                <Link href={`/web-labs/${source}/${topic.id}`}>
                  {topic.title}
                </Link>
              </h3>
              <p>{topic.summary}</p>
              <Link
                href={`/web-labs/${source}/${topic.id}`}
                className="subtle-link"
              >
                Пример и материал →
              </Link>
            </article>
          ))}
        </div>
      </section>
      {source === "juice-shop" && <JuiceChallenges />}
      <section>
        <h2>Границы проверки</h2>
        <ul>
          {audit.source.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
