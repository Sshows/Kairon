import Link from "next/link";
import jassics from "../../../../content/source-audits/jassics-plan.json";
import hamed from "../../../../content/source-audits/hamed-roadmap.json";

export const metadata = { title: "Как проверили два плана по безопасности" };
export default function StudyPlanSources() {
  return (
    <div className="page-container document-page study-plan-source">
      <Link href="/study-plan" className="back-link">
        ← Карта обучения
      </Link>
      <span className="eyebrow">РАЗБОР ДВУХ ИСТОЧНИКОВ</span>
      <h1>Что взяли из планов обучения</h1>
      <p className="lead">
        Сопоставили общую последовательность тем и планы по специализациям. На
        их основе написали оригинальные объяснения и новые упражнения Kairon;
        исходные тексты не переносили целиком.
      </p>
      <section className="notice">
        <p>
          В обоих репозиториях не найдена лицензия на повторное использование.
          Мы указываем авторов, даём ссылки на точные версии и описываем идеи
          своими словами. Код, книги и изображения из источников не включены в
          Kairon.
        </p>
      </section>
      {[
        { key: "jassics", data: jassics },
        { key: "hamed", data: hamed },
      ].map(({ key, data }) => (
        <section className="study-source-block" key={key}>
          <h2>{data.author}</h2>
          <p>
            <a href={data.url} target="_blank" rel="noreferrer">
              Оригинальный репозиторий ↗
            </a>
          </p>
          <p>
            Проверенная версия: <code>{data.commit}</code>. Дата:{" "}
            {data.reviewedAt}. Лицензия: {data.license}.
          </p>
          <p>{data.scope}</p>
          <h3>Что учтено</h3>
          <div className="study-source-sections">
            {data.sections.map((section) => (
              <article key={section.id}>
                <h4>{section.title}</h4>
                <p>{section.summary}</p>
                <a href={section.sourceUrl} target="_blank" rel="noreferrer">
                  Раздел у автора ↗
                </a>
              </article>
            ))}
          </div>
          <h3>Границы проверки</h3>
          <ul>
            {data.limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <details>
            <summary>Какие файлы прочитаны</summary>
            <ul>
              {data.filesReviewed.map((file) => (
                <li key={file}>{file}</li>
              ))}
            </ul>
          </details>
        </section>
      ))}
      <section>
        <h2>Что доступно на Kairon</h2>
        <p>
          Восемь шагов карты, 25 направлений с примерами и 12 новых уроков
          основ. Более глубокие темы остаются планами самостоятельного обучения
          со ссылками: они не означают, что все внешние курсы или лаборатории
          уже пройдены и развёрнуты здесь.
        </p>
        <p>
          Сроки авторов — ориентир, не гарантия работы или дохода. Цены
          экзаменов, подписки и рекламные утверждения не перенесены как
          проверенные факты. Для новых упражнений не нужны облачные аккаунты и
          платные ресурсы.
        </p>
        <Link href="/paths/security-basics" className="subtle-link">
          Открыть новые уроки основ →
        </Link>
      </section>
    </div>
  );
}
