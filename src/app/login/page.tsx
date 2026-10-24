import { ShieldCheck, KeyRound } from "lucide-react";
import { getLocale } from "@/lib/i18n";
import { isAuthConfigured } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
export const metadata = { title: "Вход" };
export default async function LoginPage() {
  const locale = await getLocale();
  return (
    <div className="page-container login-page">
      <div className="login-card">
        <span className="login-icon">
          <KeyRound size={28} />
        </span>
        <span className="eyebrow">WELCOME BACK</span>
        <h1>
          {locale === "ru" ? "Продолжим исследовать?" : "Ready to explore?"}
        </h1>
        <p>
          {locale === "ru"
            ? "Войди с аккаунтом, который выдал администратор."
            : "Sign in with an account provided by your administrator."}
        </p>
        <LoginForm configured={isAuthConfigured()} locale={locale} />
        <div className="login-foot">
          <ShieldCheck size={16} />
          <span>
            {locale === "ru"
              ? "Открытой регистрации нет. Для доступа обратись к администратору."
              : "Registration is closed. Contact your administrator for access."}
          </span>
        </div>
      </div>
    </div>
  );
}
