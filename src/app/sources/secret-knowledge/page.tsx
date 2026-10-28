import Link from "next/link";
import source from "../../../../content/source-audits/secret-knowledge.json";
import { SourceReview } from "@/components/source-review";
export const metadata = { title: "Разбор The Book of Secret Knowledge" };
export default function SecretSourcePage() {
  return (
    <div className="page-container document-page source-detail">
      <Link href="/collections" className="back-link">
        ← Подборки с объяснениями
      </Link>
      <span className="eyebrow">РАЗБОР ИСТОЧНИКА</span>
      <h1>The Book of Secret Knowledge: справочник для работы с системой</h1>
      <p className="lead">
        В 15 основных главах собраны программы, руководства и короткие команды.
        Мы объясняем, какую задачу решает каждый раздел. Команды из справочника
        не включены в учебные файлы: новый курс использует собственные
        сохранённые наблюдения.
      </p>
      <SourceReview source={source} />
    </div>
  );
}
