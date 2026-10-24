import { getLocale } from "@/lib/i18n";
import { Glossary } from "@/components/glossary";
export const metadata = { title: "Словарь" };
export default async function GlossaryPage() {
  const locale = await getLocale();
  return (
    <div className="page-container document-page">
      <span className="eyebrow">THE FIELD GUIDE</span>
      <h1>
        {locale === "ru"
          ? "Сложные слова. Простые объяснения."
          : "Big words. Simple explanations."}
      </h1>
      <p className="lead">
        {locale === "ru"
          ? "Нажми на термин, чтобы увидеть объяснение и пример из жизни."
          : "Open a term to see its meaning and an everyday example."}
      </p>
      <Glossary locale={locale} />
    </div>
  );
}
