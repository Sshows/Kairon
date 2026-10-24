import { requireAdmin } from "@/lib/access";
import { getLocale } from "@/lib/i18n";
export const metadata = { title: "Администрирование" };
export default async function Admin() {
  const user = await requireAdmin(),
    locale = await getLocale();
  return (
    <div className="page-container document-page">
      <span className="eyebrow">ADMIN / STAGE 0</span>
      <h1>{locale === "ru" ? "Панель администратора" : "Administration"}</h1>
      <p className="lead">
        {user.name} · {user.role}
      </p>
      <div className="notice">
        <p>
          {locale === "ru"
            ? "Сервер проверил вашу роль. На этом этапе аккаунты создаются через служебную команду. Редактор контента и управление пользователями появятся на следующих этапах."
            : "Your role was verified on the server. Accounts are created using the admin CLI at this stage. Content and user management will be added in later stages."}
        </p>
      </div>
      <div className="admin-grid">
        {[
          locale === "ru" ? "Редактор уроков" : "Lesson editor",
          locale === "ru" ? "Управление аккаунтами" : "Account management",
          locale === "ru" ? "Лабораторные сессии" : "Lab sessions",
        ].map((title) => (
          <article key={title}>
            <h2>{title}</h2>
            <span className="muted-tag">
              {locale === "ru" ? "Запланировано" : "Planned"}
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}
