type Source = {
  author: string;
  url: string;
  commit: string;
  license: string;
  reviewedAt: string;
  scope: string;
  filesReviewed: string[];
  sections: {
    id: string;
    title: string;
    summary: string;
    topics: string[];
    sourceUrl: string;
    status: string;
  }[];
  limitations: string[];
};
const statuses: Record<string, string> = {
  article: "Есть материал",
  placeholder: "Пока заготовка",
  overview: "Обзор",
  catalog: "Каталог ссылок",
};
export function SourceReview({ source }: { source: Source }) {
  return (
    <>
      <p>
        <a href={source.url} target="_blank" rel="noreferrer">
          {source.author} — оригинальный репозиторий ↗
        </a>
      </p>
      <p className="program-note">
        Проверено {source.reviewedAt}. Версия <code>{source.commit}</code>.
      </p>
      <section>
        <h2>Что проверили</h2>
        <p>{source.scope}</p>
        <h2>Лицензия и использование</h2>
        <p>{source.license}</p>
        <p>
          На Kairon опубликованы отдельные объяснения и собственные упражнения.
          Тексты глав, код, изображения, книги и исполняемые образцы источника в
          учебный набор не включены. Партнёрство с авторами не заявляется.
        </p>
      </section>
      <section className="reference-source-grid" aria-label="Разделы источника">
        {source.sections.map((section) => (
          <article key={section.id}>
            <span className="muted-tag">
              {statuses[section.status] ?? section.status}
            </span>
            <h3>{section.title}</h3>
            <p>{section.summary}</p>
            <ul>
              {section.topics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
            <a href={section.sourceUrl} target="_blank" rel="noreferrer">
              Раздел у автора ↗
            </a>
          </article>
        ))}
      </section>
      <section>
        <h2>Границы проверки</h2>
        <ul>
          {source.limitations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <details>
          <summary>Какие файлы просмотрены</summary>
          <ul>
            {source.filesReviewed.map((file) => (
              <li key={file}>{file}</li>
            ))}
          </ul>
        </details>
      </section>
    </>
  );
}
