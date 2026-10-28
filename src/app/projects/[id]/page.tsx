import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import catalog from "../../../../content/project-catalog.json";
import { projectLevels, guidedProjects } from "@/lib/project-guides";
import { Button } from "@/components/ui/button";

export function generateStaticParams() {
  return catalog.projects.map(({ id }) => ({ id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return {
    title:
      catalog.projects.find((project) => project.id === id)?.title ??
      "Проект не найден",
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = catalog.projects.find((entry) => entry.id === id);
  if (!project) notFound();
  const guided = guidedProjects[id];
  return (
    <div className="page-container document-page project-detail">
      <Link className="back-link" href="/projects">
        <ArrowLeft size={16} />
        Все проекты
      </Link>
      <span className="eyebrow">
        {projectLevels[project.level]} ·{" "}
        {project.implementation === "source"
          ? "У автора есть код"
          : "У автора описана идея"}
      </span>
      <h1>{project.title}</h1>
      <p className="project-original">
        Название оригинала: {project.originalTitle}
      </p>
      <p className="lead">{project.summary}</p>
      {guided && (
        <section className="resource-feature">
          <div>
            <h2>Начни с маленького примера</h2>
            <p>
              Для этой темы у нас есть отдельный пошаговый урок: с пояснением
              слов, кодом и проверкой результата. Большой проект автора можно
              изучить позже.
            </p>
            <Button asChild>
              <Link href={`/learn/${guided}`}>Открыть простой урок →</Link>
            </Button>
          </div>
        </section>
      )}
      <section>
        <h2>Зачем это нужно</h2>
        <p>{project.why}</p>
      </section>
      <section>
        <h2>Что сначала понять</h2>
        <ul>
          {project.prerequisites.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>
          Если эти слова пока новые, начни с{" "}
          <Link href="/learn/project-start">первой программы</Link> и{" "}
          <Link href="/learn/kali-install">запуска Kali</Link>. Вернуться к
          проекту можно позже.
        </p>
      </section>
      <section>
        <h2>План самостоятельного проекта</h2>
        <p>
          Это план работы с темой, а не команда для автоматической установки.
          Подробное устройство оригинала — по ссылкам в конце. Каждый опыт делай
          на своих учебных данных и в своей виртуальной машине.
        </p>
        <ol className="project-steps">
          {project.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
      <section>
        <h2>Что должно получиться</h2>
        <p>{project.result}</p>
        <p>
          Сравни результат с маленьким примером, который можешь проверить
          вручную. Запиши, что именно проверял и что осталось неизвестным.
        </p>
      </section>
      <section className="project-source-note">
        <h2>Ссылки и оригинал</h2>
        <p>
          {project.implementation === "source"
            ? "Папка с исходным кодом существует в проверенной версии репозитория. Наличие кода не означает, что мы запустили или проверили все его функции."
            : "В проверенной версии это описание замысла: готовая программа по указанной теме не подтверждена. План поможет понять объём самостоятельной работы."}
        </p>
        <a
          className="subtle-link"
          href={project.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          Открыть проект CarterPerez-dev <ArrowUpRight size={15} />
        </a>
        {project.docsUrl && (
          <a
            className="subtle-link"
            href={project.docsUrl}
            target="_blank"
            rel="noreferrer"
          >
            Объяснения в оригинальном проекте <ArrowUpRight size={15} />
          </a>
        )}
        <Link className="subtle-link" href="/sources/carter-projects">
          О проверке источника и лицензии →
        </Link>
      </section>
    </div>
  );
}
