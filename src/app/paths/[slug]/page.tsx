import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { paths } from "@/lib/curriculum";
import { copy, getLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { StarterPath } from "@/components/starter-path";
export default async function PathPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const path = paths.find((p) => p.slug === slug);
  if (!path) notFound();
  if (slug === "diagnostics") return <StarterPath pathId="diagnostics" />;
  if (slug === "file-analysis") return <StarterPath pathId="file-analysis" />;
  if (slug === "security-basics")
    return <StarterPath pathId="security-basics" />;
  if (slug === "from-zero") return <StarterPath />;
  if (slug === "blue-team") return <StarterPath pathId="blue-team" />;
  if (slug === "kali-tools") return <StarterPath pathId="kali-tools" />;
  const locale = await getLocale(),
    t = copy[locale];
  return (
    <div className="page-container document-page">
      <Link className="back-link" href="/#paths">
        <ArrowLeft size={16} />
        {t.goBack}
      </Link>
      <span className="eyebrow">
        PATH {path.number} / {t.preview}
      </span>
      <div className="detail-heading">
        <div>
          <h1>{path.title[locale]}</h1>
          <p>{path.description[locale]}</p>
        </div>
        <span className="version-pill">{t.planned}</span>
      </div>
      <div className="notice">
        <ShieldCheck size={20} />
        <p>{t.programNote}</p>
      </div>
      <div className="curriculum-list">
        {path.modules[locale].map((title, i) => (
          <article key={title}>
            <span className="module-number">
              {path.number}.{i + 1}
            </span>
            <div>
              <span className="eyebrow">
                {t.step} {i + 1}
              </span>
              <h2>{title}</h2>
            </div>
            <LockKeyhole size={18} />
            <span className="module-status">{t.planned}</span>
          </article>
        ))}
      </div>
      {slug === "ai-data-security" && (
        <p className="source-note">
          {locale === "ru" ? "Исходные учебные лаборатории:" : "Source labs:"}{" "}
          <a
            href="https://github.com/LevaAverGit"
            target="_blank"
            rel="noreferrer"
          >
            Lev Averyanov / LevaAverGit
            <ArrowUpRight size={13} />
          </a>
          . MIT © 2026.{" "}
          {locale === "ru"
            ? "Аудит исходников сохранён в документации проекта; адаптация ещё не выполнена."
            : "The source audit is in the project documentation; adaptation is pending."}
        </p>
      )}
      <Button variant="outline" asChild>
        <Link href="/ethics">
          {t.ethics}
          <ArrowUpRight size={15} />
        </Link>
      </Button>
    </div>
  );
}
