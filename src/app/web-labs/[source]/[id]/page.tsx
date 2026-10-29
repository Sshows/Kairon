import Link from "next/link";
import Markdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import GithubSlugger from "github-slugger";
import type { Element, Root, Nodes } from "hast";
import { webMarkdownPlugin } from "@/lib/web-markdown";
import { JuiceChallenges } from "@/components/juice-challenges";
import { notFound } from "next/navigation";
import { getCheatSheet, getWebSource, webTopics } from "@/lib/web-sources";
import { getLesson } from "@/lib/lessons";

type Props = { params: Promise<{ source: string; id: string }> };
export function generateStaticParams() {
  return webTopics.map(({ source, id }) => ({ source, id }));
}
export async function generateMetadata({ params }: Props) {
  const { source, id } = await params;
  return {
    title:
      webTopics.find((topic) => topic.source === source && topic.id === id)
        ?.title ?? "Тема не найдена",
  };
}
export default async function WebTopicPage({ params }: Props) {
  const { source, id } = await params;
  const entry = webTopics.find(
    (topic) => topic.source === source && topic.id === id,
  );
  const project = getWebSource(source);
  if (!entry || !project) notFound();
  const original =
    source === "cheat-sheets" ? await getCheatSheet(entry) : null;
  const articleLicense = entry.license === "CC-BY-SA-3.0" ? "3.0" : "4.0";
  const baseUrl = entry.sourceUrl.slice(
    0,
    entry.sourceUrl.lastIndexOf("/") + 1,
  );
  function headingIds() {
    return (tree: Root) => {
      const slugger = new GithubSlugger();
      const text = (node: Nodes): string =>
        "value" in node
          ? String(node.value)
          : "children" in node
            ? node.children.map(text).join("")
            : "";
      const visit = (node: Root | Element) => {
        if (node.type === "element" && /^h[1-6]$/.test(node.tagName))
          node.properties.id = "owasp-" + slugger.slug(text(node));
        for (const child of node.children)
          if (child.type === "element") visit(child);
      };
      visit(tree);
    };
  }
  return (
    <div className="page-container document-page source-detail web-topic-detail">
      <Link href="/web-labs#catalog" className="back-link">
        ← Все темы веб-безопасности
      </Link>
      <span className="eyebrow">{entry.sourceName}</span>
      <h1>{entry.title}</h1>
      <p className="lead">{entry.summary}</p>
      {entry.status && entry.status !== "current" && (
        <p className="program-note">
          Статус в источнике:{" "}
          {entry.status === "archived"
            ? "архивная статья"
            : "страница перехода или перенесённый материал"}
          . Учитывай это при выборе рекомендаций; сохранён текст проверенной
          версии.
        </p>
      )}
      <section className="study-example">
        <h2>Понятный пример</h2>
        <p>{entry.example}</p>
      </section>
      <section>
        <h2>Разобрать механизм по шагам</h2>
        <p>
          {entry.lessonIds.length
            ? "Эти подробные уроки объясняют связанные основы. Начни с первого, если тема новая; затем вернись к материалу ниже для деталей."
            : "Самостоятельного урока по этой узкой теме пока нет. Сначала можно пройти маршрут по дням, затем вернуться к материалу автора."}
        </p>
        <div className="study-lesson-links">
          {entry.lessonIds.map((lessonId) => {
            const lesson = getLesson(lessonId);
            return lesson ? (
              <Link key={lessonId} href={`/learn/${lessonId}`}>
                {lesson.title} →
              </Link>
            ) : null;
          })}
          <Link href="/study-plan">Вернуться к маршруту по дням →</Link>
        </div>
      </section>
      {original && (
        <section aria-label="Полный оригинал шпаргалки OWASP">
          <h2>Полная шпаргалка OWASP</h2>
          <p>
            Ниже — исходный текст на английском без сокращений. Русское
            объяснение выше помогает понять задачу; подробные уроки показывают
            действия на нашем учебном примере. Название у автора:{" "}
            <strong>{entry.originalTitle}</strong>.
          </p>
          <p className="program-note">
            Авторы: OWASP Cheat Sheet Series и участники проекта. Текст сохранён
            из версии <code>{project.audit.source.commit.slice(0, 12)}</code>,
            без перевода и изменения формулировок. Оформление страницы и ссылки
            приведены к сайту Kairon. Лицензия{" "}
            <a
              href={`https://creativecommons.org/licenses/by-sa/${articleLicense}/`}
              target="_blank"
              rel="noreferrer"
            >
              CC BY-SA {articleLicense}
            </a>
            . Отдельные атрибуции внутри статьи сохранены и действуют для
            указанных материалов.
          </p>
          {entry.filename ===
            "Infrastructure_as_Code_Security_Cheat_Sheet.md" && (
            <p className="program-note">
              Copyright © 2021 Nokia. Исходная атрибуция статьи: Creative
              Commons Attribution-ShareAlike 3.0 Unported.
            </p>
          )}
          {entry.filename === "Query_Parameterization_Cheat_Sheet.md" && (
            <p className="program-note">
              Дополнительная атрибуция в источнике: contributed by GeekMasher.
            </p>
          )}
          <div className="lesson-theory lesson-markdown web-original">
            <Markdown
              remarkPlugins={[remarkGfm, webMarkdownPlugin]}
              skipHtml
              rehypePlugins={[headingIds]}
              urlTransform={(url) => {
                if (url.startsWith("#")) return "#owasp-" + url.slice(1);
                return defaultUrlTransform(new URL(url, baseUrl).href);
              }}
              components={{
                h1: ({ children, id }) => <h2 id={id}>{children}</h2>,
                table: ({ children }) => (
                  <div className="web-table-scroll">
                    <table>{children}</table>
                  </div>
                ),
                img: ({ alt, src }) => (
                  <a
                    href={typeof src === "string" ? src : undefined}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Иллюстрация в оригинале: {alt || "открыть"} ↗
                  </a>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target={href?.startsWith("#") ? undefined : "_blank"}
                    rel="noreferrer"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {original}
            </Markdown>
          </div>
        </section>
      )}
      {source === "juice-shop" && (
        <JuiceChallenges category={entry.originalTitle} />
      )}
      <section className="project-source-note">
        {entry.officialUrl && (
          <a
            className="subtle-link"
            href={entry.officialUrl}
            target="_blank"
            rel="noreferrer"
          >
            {source === "hacker101"
              ? "Открыть занятие Hacker101 у создателей"
              : "Открыть материал на официальном сайте OWASP"}{" "}
            ↗
          </a>
        )}
        <h2>
          {original ? "Авторы и версия источника" : "Продолжить у авторов"}
        </h2>
        <a
          className="subtle-link"
          href={entry.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          {entry.originalTitle} — материал в проверенной версии ↗
        </a>
        <Link className="subtle-link" href={`/sources/${source}`}>
          Что проверено и как использована лицензия →
        </Link>
      </section>
    </div>
  );
}
