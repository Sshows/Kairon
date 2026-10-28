import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BookOpen, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Книги и проекты для Kali Linux" };
const repositories = [
  {
    name: "Hack-with-Github / Awesome-Hacking",
    url: "https://github.com/Hack-with-Github/Awesome-Hacking",
    stars: "123 599",
    description:
      "Большая карта подборок по безопасности. Удобна, когда хочешь выбрать следующее направление.",
    use: "Каталог ссылок, а не готовый курс. CC0-1.0.",
  },
  {
    name: "Omar Santos / h4cker",
    url: "https://github.com/The-Art-of-Hacking/h4cker",
    stars: "29 909",
    description:
      "Дополнительные материалы к книгам и занятиям: домашняя лаборатория, защита, сети и другие темы.",
    use: "Открывай build-your-own-lab и основы. MIT для репозитория.",
  },
  {
    name: "sundowndev / hacker-roadmap",
    url: "https://github.com/sundowndev/hacker-roadmap",
    stars: "15 670",
    description:
      "Маршрут обучения: основы, инструменты и места для разрешённой практики.",
    use: "Помогает выбрать следующую тему. MIT.",
  },
  {
    name: "meirwah / awesome-incident-response",
    url: "https://github.com/meirwah/awesome-incident-response",
    stars: "9 500",
    description:
      "Инструменты и книги для расследования инцидентов: журналы, улики и отчёт.",
    use: "Для следующего шага после наших учебных дел. Apache-2.0.",
  },
  {
    name: "Packt / Digital Forensics with Kali Linux",
    url: "https://github.com/PacktPublishing/Digital-Forensics-with-Kali-Linux",
    stars: "104",
    description:
      "Официальный репозиторий материалов к книге о цифровых расследованиях с Kali.",
    use: "Файлы по главам 7–10, MIT. Это материалы к книге, а не полная бесплатная книга.",
  },
];

export default function ResourcesPage() {
  return (
    <div className="page-container document-page resources-page">
      <Link href="/paths/from-zero" className="back-link">
        <ArrowLeft size={16} />
        Курс Kali Linux
      </Link>
      <span className="eyebrow">ЧТО СКАЧАТЬ И ЧТО ЧИТАТЬ</span>
      <h1>Книги, инструменты и следующие проекты</h1>
      <p className="lead">
        Сначала пройди короткие дела в своей Kali. Когда захочется глубже —
        здесь официальные загрузки и проверенные исходные проекты.
      </p>
      <section className="resource-feature">
        <Download size={25} />
        <div>
          <h2>Нужна сама Kali?</h2>
          <p>
            Для Windows с Intel/AMD выбирай готовую VirtualBox-машину. В нашем
            гайде показано, как распаковать архив и открыть .vbox.
          </p>
          <Button asChild>
            <Link href="/learn/kali-install">Запустить готовую Kali →</Link>
          </Button>
        </div>
      </section>
      <div className="resource-official">
        <a
          href="https://www.kali.org/get-kali/#kali-virtual-machines"
          target="_blank"
          rel="noreferrer"
        >
          Скачать Kali Linux
          <ArrowUpRight size={17} />
        </a>
        <a
          href="https://www.virtualbox.org/wiki/Downloads"
          target="_blank"
          rel="noreferrer"
        >
          Скачать VirtualBox
          <ArrowUpRight size={17} />
        </a>
        <a
          href="https://www.torproject.org/download/"
          target="_blank"
          rel="noreferrer"
        >
          Скачать Tor Browser
          <ArrowUpRight size={17} />
        </a>
        <a href="https://www.kali.org/docs/" target="_blank" rel="noreferrer">
          Официальная документация Kali
          <ArrowUpRight size={17} />
        </a>
      </div>
      <section className="resource-feature">
        <BookOpen size={25} />
        <div>
          <h2>Kali Linux Revealed</h2>
          <p>
            Официальный курс OffSec о самой Kali: устройство системы, установка
            и работа. На странице авторов он указан как бесплатный курс; для
            доступа может понадобиться аккаунт. Платные подписки для наших
            уроков не нужны.
          </p>
          <a
            className="subtle-link"
            href="https://kali.training/"
            target="_blank"
            rel="noreferrer"
          >
            Открыть у авторов
            <ArrowUpRight size={15} />
          </a>
        </div>
      </section>
      <section className="resource-feature">
        <BookOpen size={25} />
        <div>
          <h2>«Карманный хакер»: темы для работы в компании</h2>
          <p>
            Изучили доступную текстовую историю канала. На её темы подготовлен
            отдельный курс с собственными учебными данными. На странице разбора
            есть ссылки на посты, первичные источники и ограничения просмотра.
          </p>
          <Link href="/sources/pocket-hacker" className="subtle-link">
            Открыть разбор канала
            <ArrowUpRight size={15} />
          </Link>
          <Link href="/paths/blue-team" className="subtle-link">
            Перейти к 12 новым делам
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>
      <h2 className="resources-heading">Нашли на GitHub</h2>
      <section className="resource-feature">
        <BookOpen size={25} />
        <div>
          <h2>69 проектов: объясняем с нуля</h2>
          <p>
            Весь список Cybersecurity-Projects: зачем нужна каждая программа,
            что сначала понять и с чего начать. Для начинающих — восемь
            пошаговых уроков с небольшими примерами Python.
          </p>
          <Link href="/projects" className="subtle-link">
            Все проекты с объяснениями →
          </Link>
          <Link href="/learn/project-start" className="subtle-link">
            Написать свою первую программу →
          </Link>
        </div>
      </section>
      <p className="program-note">
        Звёзды проверены 25 октября 2026 года и со временем меняются. Список
        отсортирован по звёздам среди выбранных источников; это не рейтинг всех
        книг по Kali. Уроки Kairon написаны отдельно, без копирования глав.
      </p>
      <div className="resource-list">
        {repositories.map((repo) => (
          <article key={repo.url}>
            <div className="resource-title">
              <h3>
                <a href={repo.url} target="_blank" rel="noreferrer">
                  {repo.name}
                  <ArrowUpRight size={15} />
                </a>
              </h3>
              <span>★ {repo.stars}</span>
            </div>
            <p>{repo.description}</p>
            <small>{repo.use}</small>
          </article>
        ))}
      </div>
      <h2 className="resources-heading">Что сделать своими руками</h2>
      <div className="project-suggestions">
        <article>
          <span className="eyebrow">ПОСЛЕ УРОВНЯ 2</span>
          <h3>Папка расследований</h3>
          <p>
            Добавь ещё одно вымышленное письмо и составь карточку: отправитель,
            просьба, признаки, способ проверки. Не отправляй письмо никому.
          </p>
          <Link href="/learn/phishing-mail" className="subtle-link">
            Начать с примера →
          </Link>
        </article>
        <article>
          <span className="eyebrow">ПОСЛЕ УРОВНЯ 3</span>
          <h3>Свой стенд запросов</h3>
          <p>
            Запусти сайт из набора. Сравни ответы 200 и 404, состояние порта и
            журнал запросов. Зафиксируй три разных наблюдения.
          </p>
          <Link href="/learn/local-web" className="subtle-link">
            Открыть локальный сайт →
          </Link>
        </article>
        <article>
          <span className="eyebrow">ПОСЛЕ УРОВНЯ 4</span>
          <h3>План восстановления</h3>
          <p>
            Возьми только копии учебных документов. Сохрани исходную версию,
            верни резервную и сравни SHA256. Напиши, как понял, что
            восстановление удалось.
          </p>
          <Link href="/learn/final-case" className="subtle-link">
            Перейти к финальному делу →
          </Link>
        </article>
      </div>
    </div>
  );
}
