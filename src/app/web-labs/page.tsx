import Link from "next/link";
import { webSources, webTopics } from "@/lib/web-sources";
import { WebTopicCatalog } from "@/components/web-topic-catalog";

export const metadata = {
  title: "Juice Shop, Hacker101 и OWASP: веб-безопасность с нуля",
};
export default function WebLabsPage() {
  return (
    <div className="page-container document-page source-detail web-labs-page">
      <Link href="/#paths" className="back-link">
        ← Все направления
      </Link>
      <span className="eyebrow">БЕСПЛАТНАЯ ПРАКТИКА И ПОНЯТНЫЕ ОБЪЯСНЕНИЯ</span>
      <h1>Разберись, как работает сайт и откуда берутся уязвимости</h1>
      <p className="lead">
        Представь интернет-магазин: ты ищешь сок, входишь в аккаунт и кладёшь
        товар в корзину. За каждым нажатием браузер отправляет сообщение
        серверу. Одна из частых причин уязвимости — сервер доверяет этому
        сообщению больше, чем должен. Вместе проследим этот путь: от нажатия
        кнопки до решения, кому показать данные.
      </p>
      <section className="tool-course-feature">
        <span className="eyebrow">НАЧНИ ЗДЕСЬ · 14 ПОДРОБНЫХ УРОКОВ</span>
        <h2>Свой Juice Shop → наблюдение → причина → исправление</h2>
        <p>
          Juice Shop — настоящий работающий учебный магазин с намеренными
          уязвимостями. Ты запускаешь его у себя и открываешь в обычном
          браузере. Сначала научимся запускать и останавливать магазин, затем
          посмотрим запросы, сравним два своих аккаунта и разберём XSS и
          SQL-инъекцию. Вторая часть объясняет, как разработчик исправляет
          причины этих ошибок.
        </p>
        <div className="study-lesson-links">
          <Link href="/learn/web-shop-start">
            Начать: куда нажать и что запустить →
          </Link>
          <Link href="/paths/web-security">Посмотреть все 14 уроков →</Link>
        </div>
      </section>
      <section className="study-example">
        <h2>Где откроется магазин</h2>
        <p>
          На Kairon ты читаешь урок. Сам магазин работает на твоём компьютере по
          адресу <code>http://127.0.0.1:3000</code>. Это похоже на учебную кассу
          в отдельной комнате: можно разбирать её ошибки без настоящих заказов и
          покупателей. Запустил магазин в Kali — открывай его в браузере Kali.
          Запустил в Windows — открывай в Windows. Эти системы имеют каждая свой
          адрес «этот компьютер».
        </p>
        <p>
          Нужен собственный экземпляр: запуск из первого урока ограничивает
          доступ адресом 127.0.0.1. Покупать сервер или подписку не требуется.
          Публичный демонстрационный магазин оставим для знакомства с видом
          приложения; задания выполняем на своей копии.
        </p>
      </section>
      <section>
        <h2>Как пользоваться четырьмя проектами</h2>
        <div className="reference-source-grid">
          {webSources.map(({ id, audit }) => (
            <article key={id}>
              <span className="muted-tag">{audit.sections.length} тем</span>
              <h3>{audit.source.name}</h3>
              <p>
                {id === "juice-shop"
                  ? "Учебный магазин: наблюдаем ошибку и проверяем, почему она возможна. Начинаем со своей локальной копии."
                  : id === "hacker101"
                    ? "Материалы бесплатного курса HackerOne. Здесь указатель уроков с примерами; видео и официальные задания открываются у авторов."
                    : "Справочник для разработчика: как устроить защиту. В каждой теме есть русский вводный пример и полный оригинал шпаргалки на английском."}
              </p>
              <Link className="subtle-link" href={`/sources/${id}`}>
                Содержание и проверенная версия →
              </Link>
            </article>
          ))}
          <article>
            <span className="muted-tag">81 запись</span>
            <h3>Awesome-Hacking</h3>
            <p>
              Карта направлений и подборок. Помогает выбрать следующую тему
              после основ: веб, сети, расследования или разработка.
            </p>
            <Link className="subtle-link" href="/sources/awesome-hacking">
              Все записи проверенной версии →
            </Link>
            <Link className="subtle-link" href="/collections">
              Найти тему с примером →
            </Link>
          </article>
        </div>
      </section>
      <p className="program-note">
        Полные шпаргалки OWASP сохранены с авторами и лицензией CC BY-SA 4.0.
        Уроки и русские вводные примеры Kairon написаны отдельно. Видео
        Hacker101 и книга Juice Shop доступны по ссылкам у авторов. Номер версии
        источника указан на странице каждого проекта.
      </p>
      <WebTopicCatalog
        topics={webTopics.map(
          ({
            id,
            title,
            originalTitle,
            summary,
            example,
            source,
            sourceName,
          }) => ({
            id,
            title,
            originalTitle,
            summary,
            example,
            source,
            sourceName,
          }),
        )}
      />
    </div>
  );
}
