import Link from "next/link";
import source from "../../../../content/source-audits/awesome-hacking.json";
import { SourceReview } from "@/components/source-review";
export const metadata = { title: "Разбор Awesome-Hacking" };
export default function AwesomeSourcePage() {
  return (
    <div className="page-container document-page source-detail">
      <Link href="/collections" className="back-link">
        ← Подборки с объяснениями
      </Link>
      <span className="eyebrow">РАЗБОР ИСТОЧНИКА</span>
      <h1>Awesome-Hacking: карта подборок по безопасности</h1>
      <p className="lead">
        Каждая запись ведёт к отдельной подборке. Мы объяснили назначение всех
        81 записей проверенной версии и связали их с небольшими упражнениями
        Kairon. Это помогает выбрать тему для следующего шага.
      </p>
      <SourceReview source={source} />
      <section className="tool-course-feature">
        <h2>Попробовать веб-безопасность на своём магазине</h2>
        <p>
          В отдельном курсе запускаем Juice Shop, разбираем запросы и проверяем
          причины ошибок. Рядом — указатель Hacker101 и полные шпаргалки OWASP.
        </p>
        <Link href="/web-labs" className="subtle-link">
          Перейти к подробным урокам →
        </Link>
      </section>
    </div>
  );
}
