import Link from "next/link";
import source from "../../../../content/source-audits/labex-kali.json";
import { SourceReview } from "@/components/source-review";
export const metadata = { title: "Разбор LabEx Kali Free Tutorials" };
export default function LabExSourcePage() {
  return (
    <div className="page-container document-page source-detail">
      <Link href="/toolbox" className="back-link">
        ← Как работают инструменты
      </Link>
      <span className="eyebrow">РАЗБОР ИСТОЧНИКА</span>
      <h1>LabEx: 36 тем занятий по Kali</h1>
      <p className="lead">
        Репозиторий — указатель занятий на сайте LabEx. Здесь объясняем
        назначение каждой темы. Практические уроки и файлы Kairon написаны
        отдельно; доступ к внешней среде LabEx для них не нужен.
      </p>
      <Link href="/paths/kali-practice" className="subtle-link">
        Начать собственную практику на Kairon →
      </Link>
      <SourceReview source={source} />
    </div>
  );
}
