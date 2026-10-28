import Link from "next/link";
import paul from "../../../content/source-audits/paul-cybersecurity.json";
import { SecurityLibrary } from "@/components/security-library";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Как выбрать инструмент под задачу" };
export default function LibraryPage() {
  return (
    <div className="page-container document-page library-page">
      <span className="eyebrow">ЗАДАЧИ И ИНСТРУМЕНТЫ</span>
      <h1>Сначала вопрос, потом инструмент</h1>
      <p className="lead">
        Список из сотни программ полезен, когда понимаешь, что нужно проверить.
        Здесь каждую область объясняем через задачу и пример, а затем связываем
        с уроками Kairon и источником.
      </p>
      <section className="resource-feature">
        <div>
          <h2>Большие подборки — по одной понятной теме</h2>
          <p>
            Разобрали Awesome-Hacking и The Book of Secret Knowledge: 96 тем с
            объяснениями, примерами и ссылками на уроки. Для практики — новый
            путь диагностики своего сервиса.
          </p>
          <Link href="/collections" className="subtle-link">
            Выбрать тему из двух источников →
          </Link>
          <Link href="/paths/diagnostics" className="subtle-link">
            Разобраться, почему сайт не открывается →
          </Link>
        </div>
      </section>
      <section className="resource-feature">
        <div>
          <h2>Начни с разбора подозрительного файла</h2>
          <p>
            Тебе сообщили о странном вложении. Разберись, что известно, как
            отличить тип файла от его имени и почему тревога программы ещё не
            доказывает заражение. Восемь уроков используют вымышленные данные
            без настоящих вирусов.
          </p>
          <Button asChild>
            <Link href="/learn/analysis-intake">Открыть учебный случай →</Link>
          </Button>
          <Link className="subtle-link" href="/paths/file-analysis">
            Посмотреть восемь уроков
          </Link>
        </div>
      </section>
      <h2 className="resources-heading">Области защиты простыми словами</h2>
      <p>
        Разобрали справочник paulveillard/cybersecurity. Его ссылки ведут к
        разным продуктам, книгам и проектам; они не составляют единую
        установленную программу. Мы объясняем назначение разделов своими
        словами.
      </p>
      <SecurityLibrary
        areas={paul.sections.map(({ id, title, summary, topics }) => ({
          id,
          title,
          summary,
          topics,
        }))}
      />
      <section className="project-source-note">
        <h2>Два новых источника</h2>
        <p>
          Malware Bible помогает познакомиться со строением программ и
          инструментами анализа. Справочник Paul Veillard показывает разные
          области защиты. На страницах разбора отмечены незаконченные главы,
          границы проверки и лицензии.
        </p>
        <Link className="subtle-link" href="/sources/malware-bible">
          Что есть в Malware Bible →
        </Link>
        <Link className="subtle-link" href="/sources/paul-cybersecurity">
          Как проверен справочник Paul Veillard →
        </Link>
      </section>
    </div>
  );
}
