import { ReferenceRouteNote } from "@/components/reference-route-note";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BookOpen } from "lucide-react";
import catalog from "../../../content/project-catalog.json";
import { ProjectCatalog } from "@/components/project-catalog";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Проекты по безопасности — простыми словами" };

export default function ProjectsPage() {
  return (
    <div className="page-container document-page projects-page">
      <Link className="back-link" href="/resources">
        <ArrowLeft size={16} />
        Книги и материалы
      </Link>
      <ReferenceRouteNote />
      <span className="eyebrow">СДЕЛАЙ ЧТО-ТО СВОИМИ РУКАМИ</span>
      <h1>Проекты по безопасности — с понятного первого шага</h1>
      <p className="lead">
        Программа не обязана быть большой. Начнём с нескольких строк: научим
        компьютер замечать изменение файла и считать ошибки входа. Потом можно
        выбрать задачу посложнее.
      </p>
      <section className="resource-feature">
        <BookOpen size={26} />
        <div>
          <h2>Пока не умеешь программировать?</h2>
          <p>
            Восемь уроков с нуля: где открыть файл, что в нём написать, что
            делает каждая часть и какой ответ ждать. Всё выполняется в своей
            Kali. Скачиваемый набор уже содержит наши небольшие примеры.
          </p>
          <Button asChild>
            <Link href="/learn/project-start">Моя первая программа →</Link>
          </Button>
          <Link className="subtle-link" href="/paths/kali-tools">
            Посмотреть восемь уроков
          </Link>
        </div>
      </section>
      <h2 className="resources-heading">
        Все проекты из Cybersecurity-Projects
      </h2>
      <p>
        Разобрали список CarterPerez-dev: {catalog.projects.length} проектов.
        Для каждого написали по-русски, зачем он нужен, что сначала понять и как
        подойти к работе. «Есть код» означает наличие исходников у автора; это
        не обещание, что большая программа уже установлена на Kairon.
      </p>
      <ProjectCatalog
        projects={catalog.projects.map(
          ({
            id,
            title,
            originalTitle,
            summary,
            why,
            level,
            implementation,
          }) => ({
            id,
            title,
            originalTitle,
            summary,
            why,
            level,
            implementation,
          }),
        )}
      />
      <section className="project-source-note" aria-label="Источник каталога">
        <h2>Откуда взяты темы</h2>
        <p>
          <a href={catalog.source.url} target="_blank" rel="noreferrer">
            CarterPerez-dev / Cybersecurity-Projects <ArrowUpRight size={14} />
          </a>
          . Проверенная версия:{" "}
          <code>{catalog.source.commit.slice(0, 12)}</code>, 28 октября 2026
          года. Лицензия оригинала — AGPL-3.0. Объяснения и маленькие учебные
          программы Kairon написаны отдельно. Программы исходного репозитория не
          запускались.
        </p>
        <Link href="/sources/carter-projects" className="subtle-link">
          Что именно проверили и что есть в источнике →
        </Link>
      </section>
      <section className="project-more-links">
        <h2>Куда двигаться после основ</h2>
        <p>
          Это дополнительные материалы автора. Части внешних курсов и экзамены
          могут быть платными; нашим урокам подписка не нужна.
        </p>
        <div className="resource-grid">
          {catalog.roadmaps.map((item) => (
            <article key={item.url}>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <a href={item.url} target="_blank" rel="noreferrer">
                Маршрут у автора <ArrowUpRight size={14} />
              </a>
            </article>
          ))}
        </div>
        <h2>Другие материалы</h2>
        <div className="resource-grid">
          {catalog.resources.map((item) => (
            <article key={item.url}>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <a href={item.url} target="_blank" rel="noreferrer">
                Открыть раздел <ArrowUpRight size={14} />
              </a>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
