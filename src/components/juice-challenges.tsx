import Markdown from "react-markdown";
import juice from "../../content/source-audits/juice-shop.json";

export function JuiceChallenges({ category }: { category?: string }) {
  const challenges = juice.challenges.filter(
    (challenge) => !category || challenge.category === category,
  );
  return (
    <section aria-label="Все задачи Juice Shop" className="juice-challenges">
      <h2>
        {category
          ? "Задачи этой категории"
          : `Все ${juice.challenges.length} основных задач Juice Shop`}
      </h2>
      <p>
        Ниже — полный указатель задач закреплённой версии. Оригинальные названия
        и условия оставлены на английском. Число звёзд обозначает сложность по
        оценке авторов. Подробные русские уроки выше разбирают первые шаги и
        выбранные задачи; остальные условия можно изучать после основ.
      </p>
      <p className="program-note">
        Это основные Hacking Challenges. У 35 из них есть ещё два этапа работы с
        кодом: найти ошибку и выбрать исправление. Магазин считает эти 70 этапов
        отдельно, поэтому общий счётчик показывает 186. Они открываются по
        условиям самого магазина; каталог ниже содержит 116 основных задач.
      </p>
      <p className="program-note">
        Для каждого опыта используется своя локальная копия. Отдельные задания
        недоступны в указанных средах или требуют дополнительных сервисов: это
        отмечено у задачи.
      </p>
      <div className="reference-source-grid">
        {challenges.map((challenge) => (
          <article key={challenge.id} id={`challenge-${challenge.id}`}>
            <span className="muted-tag">
              {challenge.difficulty} / 6 · {challenge.category}
            </span>
            <h3>{challenge.name}</h3>
            <div className="juice-challenge-condition">
              <Markdown skipHtml>{challenge.description}</Markdown>
            </div>
            {challenge.disabledEnv.length > 0 && (
              <p>Отключено в средах: {challenge.disabledEnv.join(", ")}</p>
            )}
            <a href={challenge.sourceUrl} target="_blank" rel="noreferrer">
              Условие в исходнике этой версии ↗
            </a>
            {challenge.mitigationUrl && (
              <a
                href={challenge.mitigationUrl}
                target="_blank"
                rel="noreferrer"
              >
                Материал о защите ↗
              </a>
            )}
          </article>
        ))}
      </div>
      <details>
        <summary>Авторство и лицензия MIT для каталога задач</summary>
        <p>{juice.copyright}</p>
        <pre className="source-license-text">{juice.licenseText}</pre>
      </details>
    </section>
  );
}
