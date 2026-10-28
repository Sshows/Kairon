import Link from "next/link";
import { notFound } from "next/navigation";
import { toolboxTools } from "@/lib/toolbox";
import { getLesson } from "@/lib/lessons";
type Props = { params: Promise<{ id: string }> };
export function generateStaticParams() {
  return toolboxTools.map(({ id }) => ({ id }));
}
export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return {
    title:
      toolboxTools.find((tool) => tool.id === id)?.name ??
      "Инструмент не найден",
  };
}
export default async function ToolPage({ params }: Props) {
  const { id } = await params;
  const tool = toolboxTools.find((tool) => tool.id === id);
  if (!tool) notFound();
  return (
    <div className="page-container document-page library-detail tool-detail">
      <Link href="/toolbox" className="back-link">
        ← Все инструменты
      </Link>
      <span className="eyebrow">ПОНИМАЕМ ДЕЙСТВИЕ И РЕЗУЛЬТАТ</span>
      <h1>{tool.name}</h1>
      <p className="lead">{tool.summary}</p>
      <section className="tool-mechanism">
        <h2>Как это работает</h2>
        <p>{tool.howItWorks}</p>
      </section>
      <section className="study-example">
        <h2>Пример задачи</h2>
        <p>{tool.example}</p>
      </section>
      <section>
        <h2>Как пользоваться по шагам</h2>
        <ol className="tool-steps">
          {tool.steps.map((step, index) => (
            <li key={step.title}>
              <span className="eyebrow">ШАГ {index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.explanation}</p>
              {"command" in step && step.command && (
                <pre>
                  <code>{step.command}</code>
                </pre>
              )}
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h2>Как понять результат</h2>
        <p>{tool.result}</p>
        <h2>Чего эта проверка не устанавливает</h2>
        <ul>
          {tool.limits.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Попробуй сам</h2>
        <p>
          В уроках есть подготовка, учебные файлы, объяснения опций и
          самопроверка. Читать можно без регистрации.
        </p>
        <div className="study-lesson-links">
          {tool.lessonIds.map((lessonId) => (
            <Link href={`/learn/${lessonId}`} key={lessonId}>
              {getLesson(lessonId)!.title} →
            </Link>
          ))}
        </div>
      </section>
      <section className="project-source-note">
        <h2>Документация и материалы</h2>
        {tool.resources.map((resource) => (
          <a
            key={resource.url}
            className="subtle-link"
            href={resource.url}
            target="_blank"
            rel="noreferrer"
          >
            {resource.label} ↗
          </a>
        ))}
        <Link className="subtle-link" href="/sources/labex-kali">
          Что проверили в указателе LabEx →
        </Link>
      </section>
    </div>
  );
}
