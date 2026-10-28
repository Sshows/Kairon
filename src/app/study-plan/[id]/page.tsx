import Link from "next/link";
import { notFound } from "next/navigation";
import jassics from "../../../../content/source-audits/jassics-plan.json";
import { directionLessons } from "@/lib/study-plan";
import { getLesson } from "@/lib/lessons";

export function generateStaticParams() {
  return jassics.sections.map(({ id }) => ({ id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return {
    title:
      jassics.sections.find((section) => section.id === id)?.title ??
      "Направление не найдено",
  };
}
export default async function DirectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const section = jassics.sections.find((item) => item.id === id);
  if (!section) notFound();
  return (
    <div className="page-container document-page study-direction-detail">
      <Link href="/study-plan#directions" className="back-link">
        ← Все направления
      </Link>
      <span className="eyebrow">ВЫБИРАЕМ СЛЕДУЮЩУЮ ТЕМУ</span>
      <h1>{section.title}</h1>
      <p className="lead">{section.summary}</p>
      <section>
        <h2>Как это выглядит в работе</h2>
        <p>{section.example}</p>
      </section>
      <section>
        <h2>Попробуй на учебном примере</h2>
        <p>{section.practice}</p>
        <p>
          Запиши исходные данные, свои действия, результат и то, чего пока не
          знаешь. Не используй рабочие секреты и чужие системы.
        </p>
      </section>
      <section>
        <h2>Начальные уроки на Kairon</h2>
        <p>
          Эти уроки дают основу для темы. Они не заменяют всю специализацию, но
          помогут понять оригинальный план.
        </p>
        <div className="study-lesson-links">
          {(directionLessons[id] ?? []).map((lessonId) => (
            <Link key={lessonId} href={`/learn/${lessonId}`}>
              {getLesson(lessonId)!.title} →
            </Link>
          ))}
        </div>
      </section>
      <section>
        <h2>Что изучать глубже</h2>
        <ul>
          {section.topics.map((topic) => (
            <li key={topic}>{topic}</li>
          ))}
        </ul>
      </section>
      <section className="study-example">
        <h2>Как понять, что разобрался</h2>
        <p>{section.readyWhen}</p>
      </section>
      <section className="project-source-note">
        <h2>План автора</h2>
        <p>
          Источник тем — jassics / security-study-plan. Наши объяснения и
          задание написаны отдельно. Внешний план может включать платные курсы и
          авторские оценки длительности. Покупать что-либо для начальных уроков
          Kairon не нужно.
        </p>
        <a
          href={section.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="subtle-link"
        >
          Открыть закреплённую версию плана у автора ↗
        </a>
        <Link href="/sources/study-plans" className="subtle-link">
          Как проверены оба источника →
        </Link>
      </section>
    </div>
  );
}
