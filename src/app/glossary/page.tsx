import { requireUser } from "@/lib/access";
import { getLocale } from "@/lib/i18n";
import { Glossary } from "@/components/glossary";
import { terms } from "@/lib/glossary";
import Link from "next/link";
export const metadata = { title: "Словарь" };
export default async function GlossaryPage() {
  await requireUser();
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
      <p>
        <Link className="subtle-link" href="/reading/security-language">
          Подробно: John the Ripper, MITM, Metasploit и инъекции →
        </Link>
      </p>
      <Glossary locale={locale} terms={terms} />
    </div>
  );
}
