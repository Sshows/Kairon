import { requireUser } from "@/lib/access";
import Link from "next/link";
import source from "../../../../content/source-audits/paul-cybersecurity.json";
import { SourceReview } from "@/components/source-review";
export const metadata = { title: "Разбор справочника Paul Veillard" };
export default async function PaulSourcePage() {
  await requireUser();
  return (
    <div className="page-container document-page source-detail">
      <Link href="/library" className="back-link">
        ← Задачи и инструменты
      </Link>
      <span className="eyebrow">РАЗБОР ИСТОЧНИКА</span>
      <h1>Paul Veillard: карта областей защиты</h1>
      <p className="lead">
        Это большой указатель тем, продуктов и материалов. Он полезен как
        справочник, когда уже понятен вопрос. Мы связали области с небольшими
        примерами и действующими уроками.
      </p>
      <Link className="subtle-link" href="/library">
        Выбрать область по задаче →
      </Link>
      <SourceReview source={source} />
    </div>
  );
}
