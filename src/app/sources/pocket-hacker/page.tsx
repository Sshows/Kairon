import Link from "next/link";
import { ArrowLeft, ArrowRight, ExternalLink, ShieldCheck } from "lucide-react";
import audit from "../../../../content/source-audits/pocket-hacker.json";
import { getCourseLessons } from "@/lib/lessons";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Как проверили канал «Карманный хакер»" };

const corrections = [
  {
    topic: "Платный профиль не подтверждает личность",
    text: "Возраст аккаунта, страна номера, фотографии и подписка не доказывают, что человек заслуживает доверия. Проверяй сам запрос и связывайся по уже известному контакту.",
    post: 242,
    source:
      "https://www.cisa.gov/secure-our-world/recognize-and-report-phishing",
    label: "CISA: распознавание фишинга",
  },
  {
    topic: "Tor не обещает полной невидимости",
    text: "Tor Browser защищает маршрут своего трафика. Вход в личный аккаунт и переданные данные всё равно могут раскрывать личность; остальные программы не становятся анонимными автоматически.",
    post: 252,
    source:
      "https://support.torproject.org/tor-browser/getting-started/about-tor-browser/",
    label: "Tor Project: возможности браузера",
  },
  {
    topic: "SMS и приложение с кодами имеют ограничения",
    text: "SMS может участвовать в многофакторном входе, но этот способ слабее устойчивых к фишингу методов. Наличие одноразового кода само по себе не защищает от поддельного сайта.",
    post: 9,
    source: "https://pages.nist.gov/800-63-4/sp800-63b.html",
    label: "NIST: аутентификаторы и фишинг",
  },
  {
    topic: "Запись в конфигурации ещё не доказывает настройку",
    text: "У OpenSSH часто используется первое полученное значение параметра. Поэтому файл с названием 99-… не гарантирует отключение паролей. Проверять нужно эффективную конфигурацию и способы входа, не теряя запасной доступ.",
    post: 255,
    source: "https://man.openbsd.org/sshd_config",
    label: "OpenSSH: порядок чтения настроек",
  },
  {
    topic: "CVSS и EPSS отвечают на разные вопросы",
    text: "CVSS описывает техническую тяжесть. EPSS оценивает вероятность наблюдаемой эксплуатации в ближайшие 30 дней, а не вероятность взлома именно твоей компании. Приоритет зависит и от доступности системы, данных, эксплуатации и защитных мер.",
    post: 249,
    source: "https://www.first.org/epss/",
    label: "FIRST: что оценивает EPSS",
  },
  {
    topic: "200 OK не равнозначен найденной уязвимости",
    text: "Нужны права тестового пользователя, владелец объекта и фактически полученные данные. Код ответа или читаемая часть токена без такой проверки не доказывают обход доступа.",
    post: 269,
    source: "https://portswigger.net/web-security/access-control/idor",
    label: "PortSwigger: проверка доступа к объектам",
  },
  {
    topic: "Удалить ключ из текста недостаточно",
    text: "Опубликованный рабочий секрет сначала отзывают или меняют. Затем убирают источник утечки и разбирают копии по правилам хранения. В публичный анализатор нельзя отправлять рабочие токены и документы без оценки данных и разрешения.",
    post: 264,
    source:
      "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository",
    label: "GitHub: действия при утечке",
  },
];

export default function PocketHackerSourcePage() {
  const course = getCourseLessons("blue-team");
  return (
    <div className="page-container document-page source-review-page">
      <Link href="/paths/blue-team" className="back-link">
        <ArrowLeft size={16} />
        Безопасность в компании
      </Link>
      <span className="eyebrow">РАЗБОР ИСТОЧНИКА · 27 ОКТЯБРЯ 2026</span>
      <h1>Что взяли из «Карманного хакера»</h1>
      <p className="lead">
        Канал{" "}
        <a href={audit.channel} target="_blank" rel="noreferrer">
          @PocketHackerOne
          <ExternalLink size={15} />
        </a>{" "}
        подсказал темы для второго пути. Учебные объяснения, вопросы и файлы мы
        написали для Kairon, а технические правила сверили с документацией.
      </p>
      <div className="learning-stats source-review-stats">
        <article>
          <strong>{audit.public_post_count}</strong>
          <span>записей публичной истории</span>
        </article>
        <article>
          <strong>{audit.readable_text_posts}</strong>
          <span>текстовых записей просмотрено</span>
        </article>
        <article>
          <strong>{course.length}</strong>
          <span>новых учебных дел</span>
        </article>
      </div>
      <section className="notice">
        <ShieldCheck size={22} />
        <div>
          <h2>Границы просмотра</h2>
          <p>
            13 страниц веб-истории, с 24 августа 2025 по 24 октября 2026.
            Прокрутка дошла до начала доступной публичной истории. Удалённые
            сообщения и закрытый платный архив недоступны. Содержимое
            изображений, видео, аудио и PDF не изучалось: просмотрены текст и
            видимые подписи. У четырёх записей текст отсутствует, у семи есть
            подписи к вложениям.
          </p>
          <p>
            Это отбор тем, без копирования публикаций и книг. Kairon не заявляет
            партнёрство с автором канала.
          </p>
        </div>
      </section>
      <h2 className="resources-heading">Из тем — в практику</h2>
      <p className="program-note">
        Новые задания разыгрываются в вымышленной компании. Журналы и адреса
        созданы для упражнений. На настоящую инфраструктуру подключаться не
        нужно.
      </p>
      <div className="source-lesson-list">
        {course.map((lesson) => {
          const references = lesson.resources.filter((resource) =>
            resource.url.startsWith("https://t.me/PocketHackerOne/"),
          );
          return (
            <article key={lesson.id}>
              <div>
                <h3>
                  <Link href={"/learn/" + lesson.id}>
                    {lesson.title}
                    <ArrowRight size={16} />
                  </Link>
                </h3>
                <p>{lesson.summary}</p>
              </div>
              <div className="source-post-links">
                {references.map((resource) => (
                  <a
                    href={resource.url}
                    key={resource.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Пост {resource.url.split("/").at(-1)}
                    <ExternalLink size={13} />
                  </a>
                ))}
              </div>
            </article>
          );
        })}
      </div>
      <h2 className="resources-heading">Какие выводы требуют осторожности</h2>
      <div className="resource-list">
        {corrections.map((item) => (
          <article key={item.post}>
            <h3>{item.topic}</h3>
            <p>{item.text}</p>
            <div className="source-check-links">
              <a
                href={"https://t.me/PocketHackerOne/" + item.post}
                target="_blank"
                rel="noreferrer"
              >
                Исходная тема
                <ExternalLink size={13} />
              </a>
              <a href={item.source} target="_blank" rel="noreferrer">
                {item.label}
                <ExternalLink size={13} />
              </a>
            </div>
          </article>
        ))}
      </div>
      <h2 className="resources-heading">Что не стало заданиями</h2>
      <p className="program-note">
        Реклама, оценки зарплат, неподтверждённые цифры и личные мнения не
        выдаются за правила для всех компаний. Скрытые кейлоггеры, помехи чужим
        сетям, обход защиты и «розыгрыши» не добавлены. Вместо них — поиск
        следов, проверка разрешений и восстановление на собственных данных.
      </p>
      <details className="source-index">
        <summary>
          Указатель всех {audit.public_post_count} доступных записей
        </summary>
        <p>
          Темы ниже — редакционные метки для навигации, не заголовки автора и не
          одобрение каждого совета.
        </p>
        <div className="source-index-grid">
          {audit.posts.map((post) => (
            <a key={post.id} href={post.url} target="_blank" rel="noreferrer">
              <span>#{post.id}</span>
              <span>{post.topic}</span>
              <small>{post.date?.slice(0, 10)}</small>
            </a>
          ))}
        </div>
      </details>
      <div className="course-actions">
        <Button asChild>
          <Link href="/learn/soc-first-shift">
            Начать первую смену
            <ArrowRight size={16} />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/paths/blue-team">Вся программа</Link>
        </Button>
      </div>
    </div>
  );
}
