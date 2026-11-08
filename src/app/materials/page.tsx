import { requireUser } from "@/lib/access";
import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { Catalog } from "@/components/catalog";
import { getLocale } from "@/lib/i18n";
import { paths } from "@/lib/curriculum";

export const metadata = { title: "Справочники и загрузки" };
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
    body: "Juice Shop, материалы Hacker101 и полные шпаргалки OWASP. Основные занятия уже включены в дни 50–60 и 67–70.",
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
  await requireUser();
  const locale = await getLocale();
  return (
    <div className="page-container document-page materials-page">
      <Link href="/study-plan" className="back-link">
        ← К плану по дням
      </Link>
      <span className="eyebrow">КОГДА НУЖНО ПОВТОРИТЬ ИЛИ УЗНАТЬ БОЛЬШЕ</span>
      <h1>Справочники и загрузки</h1>
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
      <section className="reading-panel">
        <h2>Все занятия — в общем плане</h2>
        <p>
          Автоматизация на Python, bug bounty, анализ программ, криптография и
          76 разборов практикумов pwn.college, CTF Archive, TryHackMe, Hack The Box
          Academy, PayloadsAllTheThings и OWASP WSTG (Linux Luminarium, The Art of
          the Shell, Computing 101, Intro to Programming Languages, Playing With
          Programs, Intro to Cybersecurity, Program Security, System Security,
          Software Exploitation, Cryptomania, Content Injection, ARM64/XNU,
          Windows Warzone, Fuzz Dojo, DOS Dojo, dojjail, Linux Lunacy, Symbolic
          Execution, Active Directory &amp; AD CS, PrivEsc, Cloud SSRF/IMDSv2,
          GraphQL/JWT, Docker/Kubernetes, CI/CD, Volatility 3, AMSI/ETW,
          SOC/DFIR/SOAR, все 7 видов SQL-инъекций, NoSQLi/LDAP, XXE/CORS/File
          Upload, Reversing/Pwn CTF Archive, DEF CON 33 DCA, ACSAC CTF и Hacker
          History). Все эти занятия идут по порядку в днях 61–114, с практикой и
          сохранением отметок в аккаунте.
        </p>
        <Link className="subtle-link" href="/days/61">
          Перейти к дню 61 →
        </Link>
      </section>
      <details className="legacy-course-index" id="topics">
        <summary>Найти уроки по прежним разделам</summary>
        <p>
          Все эти уроки уже есть в плане по дням. Этот указатель удобен, когда
          хочешь повторить одну тему.
        </p>
        <Catalog locale={locale} paths={paths} />
      </details>
    </div>
  );
}
