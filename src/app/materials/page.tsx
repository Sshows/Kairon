import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { Catalog } from "@/components/catalog";
import { getLocale } from "@/lib/i18n";

export const metadata = { title: "Дополнительные материалы" };
const resources = [
  {
    href: "/glossary",
    title: "Объяснить незнакомое слово",
    body: "Короткая подсказка по терминам. Полный разбор и примеры остаются в уроках.",
  },
  {
    href: "/toolbox",
    title: "Вспомнить команду или инструмент",
    body: "Когда нужен Nmap, curl, OpenSSL и другие программы, что означают параметры и результат.",
  },
  {
    href: "/web-labs",
    title: "Углубиться в безопасность сайтов",
    body: "Juice Shop, материалы Hacker101 и полные шпаргалки OWASP. Основные занятия уже включены в последние дни плана.",
  },
  {
    href: "/projects",
    title: "Выбрать следующий проект",
    body: "Идеи и исходные проекты после базового обучения, с объяснением нужных навыков.",
  },
  {
    href: "/library",
    title: "Найти материал под задачу",
    body: "Сети, расследования, защита приложений и другие области — для повторения и дальнейшего изучения.",
  },
  {
    href: "/collections",
    title: "Изучить подборки и книги",
    body: "Разобранные указатели Awesome-Hacking и The Book of Secret Knowledge.",
  },
  {
    href: "/resources",
    title: "Официальные загрузки и источники",
    body: "Где скачивать программы и читать исходные материалы авторов.",
  },
];
export default async function MaterialsPage() {
  const locale = await getLocale();
  return (
    <div className="page-container document-page materials-page">
      <Link href="/study-plan" className="back-link">
        ← К плану по дням
      </Link>
      <span className="eyebrow">КОГДА НУЖНО ПОВТОРИТЬ ИЛИ УЗНАТЬ БОЛЬШЕ</span>
      <h1>Дополнительные материалы</h1>
      <p className="lead">
        Здесь можно найти отдельную тему, справку или следующий проект. Если ты
        только пришёл, начни с первого дня: там уже выбран порядок обучения.
      </p>
      <Link className="materials-start-link" href="/days/1">
        Перейти к первому дню
        <ArrowRight size={17} />
      </Link>
      <div className="materials-grid">
        {resources.map((resource) => (
          <article key={resource.href}>
            <BookOpen size={21} />
            <h2>
              <Link href={resource.href}>{resource.title}</Link>
            </h2>
            <p>{resource.body}</p>
            <Link href={resource.href} className="subtle-link">
              Открыть →
            </Link>
          </article>
        ))}
      </div>
      <details className="legacy-course-index" id="topics">
        <summary>Найти уроки по прежним разделам</summary>
        <p>
          Все эти уроки уже есть в плане по дням. Этот указатель удобен, когда
          хочешь повторить одну тему.
        </p>
        <Catalog locale={locale} />
      </details>
    </div>
  );
}
