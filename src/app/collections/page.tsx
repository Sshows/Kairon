import Link from "next/link";
import { collections } from "@/lib/collections";
import { KnowledgeCollections } from "@/components/knowledge-collections";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Подборки знаний: объяснения и примеры" };
export default function CollectionsPage() {
  return (
    <div className="page-container document-page library-page">
      <span className="eyebrow">ЧТО ИЗУЧАТЬ И ЗАЧЕМ</span>
      <h1>Разбираемся в больших подборках</h1>
      <p className="lead">
        В Awesome-Hacking собраны ссылки на 81 подборку, а в The Book of Secret
        Knowledge — 15 основных глав. Здесь объясняем каждую тему: какую задачу
        она решает, как выглядит на примере и с чего начать на Kairon.
      </p>
      <section className="resource-feature">
        <div>
          <h2>Практика: сайт не открывается</h2>
          <p>
            Восемь уроков на одном учебном деле. Уточни проблему, проверь
            сохранённые наблюдения DNS и TLS, свяжи журналы и выбери проверку
            результата. Все файлы можно разобрать в своей Kali без сервера.
          </p>
          <Button asChild>
            <Link href="/learn/diag-intake">Разобрать первое обращение →</Link>
          </Button>
          <Link className="subtle-link" href="/paths/diagnostics">
            Посмотреть восемь уроков
          </Link>
        </div>
      </section>
      <section className="tool-course-feature">
        <h2>Как работают инструменты Kali</h2>
        <p>
          Выбери инструмент и разберись в его действии: что он отправляет в сеть
          или делает с файлом, как читать вывод и чего проверка ещё не
          доказывает. Для практики есть 12 уроков со своим локальным сервисом.
        </p>
        <Link href="/toolbox" className="subtle-link">
          Nmap, Netcat, Hydra, Hashcat и OpenSSL с объяснениями →
        </Link>
      </section>
      <KnowledgeCollections
        entries={collections.map(
          ({
            id,
            source,
            sourceName,
            title,
            summary,
            example,
            sourceHeading,
            topics,
          }) => ({
            id,
            source,
            sourceName,
            title,
            summary,
            example,
            sourceHeading,
            topics,
          }),
        )}
      />
      <section className="project-source-note">
        <h2>Как использованы источники</h2>
        <p>
          Это карта тем и внешних справочников. Пояснения и примеры Kairon
          написаны отдельно. Внешние инструменты не установлены на сайте; для
          них нужны собственная проверка требований и разрешённая учебная среда.
        </p>
        <Link className="subtle-link" href="/sources/awesome-hacking">
          Разбор Awesome-Hacking →
        </Link>
        <Link className="subtle-link" href="/sources/secret-knowledge">
          Разбор The Book of Secret Knowledge →
        </Link>
      </section>
    </div>
  );
}
