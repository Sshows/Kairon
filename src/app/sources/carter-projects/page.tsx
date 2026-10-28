import Link from "next/link";
import catalog from "../../../../content/project-catalog.json";

export const metadata = { title: "Разбор Cybersecurity-Projects" };
export default function CarterSourcePage() {
  const code = catalog.projects.filter(
    (project) => project.implementation === "source",
  ).length;
  return (
    <div className="page-container document-page project-detail">
      <Link href="/projects" className="back-link">
        ← Все проекты
      </Link>
      <span className="eyebrow">РАЗБОР ИСТОЧНИКА · 28 ОКТЯБРЯ 2026</span>
      <h1>Что добавили из Cybersecurity-Projects</h1>
      <p className="lead">
        Весь список из {catalog.projects.length} проектов получил отдельные
        карточки с объяснениями по-русски. Для первого шага подготовлены восемь
        уроков с собственными маленькими программами Kairon.
      </p>
      <h2>Что проверено</h2>
      <p>
        README, лицензия, описания проектов, учебные обзоры и структура папок. В{" "}
        {code} случаях есть папка с кодом, ещё {catalog.projects.length - code}{" "}
        — описания идей. Внешние приложения не запускались; наличие файлов
        тестов не подтверждает, что эти тесты прошли.
      </p>
      <p>
        README содержит значок «70», но его таблицы в проверенной версии
        перечисляют {catalog.projects.length} отдельных проектов. В каталоге
        учтены именно строки таблиц, без выдуманного недостающего проекта.
      </p>
      <h2>Что сделали для Kairon</h2>
      <p>
        Переписали объяснения простыми словами, добавили цель, необходимые
        понятия, план, результат и ссылки на точную версию оригинала. Наши
        восемь уроков и 15 файлов отдельного набора написаны заново. Они читают
        вымышленные данные без сетевых запросов. Уроки Kali и компании также
        переработаны: новые слова, команды и ожидаемый результат объясняются на
        месте.
      </p>
      <h2>Автор и лицензия</h2>
      <p>
        <a href={catalog.source.url} target="_blank" rel="noreferrer">
          CarterPerez-dev / Cybersecurity-Projects
        </a>
        , версия <code>{catalog.source.commit}</code>. Лицензия исходника —{" "}
        <a
          href={`https://github.com/CarterPerez-dev/Cybersecurity-Projects/blob/${catalog.source.commit}/LICENSE`}
          target="_blank"
          rel="noreferrer"
        >
          GNU AGPL version 3
        </a>
        . Его программный код и большие фрагменты текстов не включены в Kairon.
        Партнёрство с автором не заявляется.
      </p>
      <h2>Границы</h2>
      <p>
        Каталог не означает, что 69 программ развёрнуты на сайте или готовы к
        эксплуатации. Некоторые проекты требуют дополнительных знаний, сервисов
        и затрат. Сценарии скрытого наблюдения и вредоносных действий
        рассматриваются как темы для понимания защиты; готового инструмента для
        таких действий Kairon не предоставляет. Сайт проверяет короткий ответ, а
        не работу компьютера ученика.
      </p>
      <Link href="/paths/kali-tools" className="subtle-link">
        Перейти к восьми пошаговым урокам →
      </Link>
      <Link href="/projects" className="subtle-link">
        Открыть весь каталог →
      </Link>
    </div>
  );
}
