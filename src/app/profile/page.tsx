import Link from "next/link";
import { Compass, ShieldCheck, UserRound } from "lucide-react";
import { requireUser } from "@/lib/access";
import { getLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Профиль" };
export default async function Profile() {
  const user = await requireUser(),
    locale = await getLocale();
  return (
    <div className="page-container document-page">
      <span className="eyebrow">YOUR ACCOUNT</span>
      <h1>{locale === "ru" ? "Твоё пространство" : "Your workspace"}</h1>
      <div className="profile-card">
        <span className="login-icon">
          <UserRound size={26} />
        </span>
        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <span className="muted-tag">{user.role}</span>
        </div>
      </div>
      <section className="notice">
        <ShieldCheck size={21} />
        <div>
          <h2>
            {locale === "ru"
              ? "Правила безопасной практики"
              : "Safe practice rules"}
          </h2>
          <p>
            {user.ethicsAcceptedAt
              ? locale === "ru"
                ? "Правила приняты. Спасибо за ответственное отношение к практике."
                : "Rules accepted. Thank you for practicing responsibly."
              : locale === "ru"
                ? "Перед первой лабораторией прочитай и прими правила."
                : "Read and accept the rules before your first lab."}
          </p>
          {!user.ethicsAcceptedAt && (
            <Link href="/ethics" className="subtle-link">
              {locale === "ru" ? "Прочитать правила" : "Read the rules"}
            </Link>
          )}
        </div>
      </section>
      <div className="empty-state">
        <Compass size={32} />
        <h2>
          {locale === "ru"
            ? "Твой учебный путь впереди"
            : "Your learning journey is ahead"}
        </h2>
        <p>
          {locale === "ru"
            ? "Личный прогресс и награды появятся после запуска учебного ядра."
            : "Progress and rewards will become available with the learning engine."}
        </p>
        <Button asChild>
          <Link href="/#paths">
            {locale === "ru"
              ? "Посмотреть программу"
              : "Explore the curriculum"}
          </Link>
        </Button>
      </div>
    </div>
  );
}
