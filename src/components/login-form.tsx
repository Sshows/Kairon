"use client";
import { useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { loginAction } from "@/app/actions";
import { Button } from "./ui/button";
export function LoginForm({
  configured,
  locale,
}: {
  configured: boolean;
  locale: "ru" | "en";
}) {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="login-form">
      <label htmlFor="email">
        Email
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          disabled={!configured}
          placeholder="you@example.com"
        />
      </label>
      <label htmlFor="password">
        {locale === "ru" ? "Пароль" : "Password"}
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={12}
          maxLength={72}
          disabled={!configured}
          placeholder="••••••••••••"
        />
      </label>
      {state?.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      {!configured && (
        <p role="status" className="form-notice">
          {locale === "ru"
            ? "Вход временно недоступен. Администратор завершает настройку платформы."
            : "Sign-in is unavailable while the administrator finishes platform setup."}
        </p>
      )}
      <Button disabled={!configured || pending} type="submit">
        {pending ? (
          <LoaderCircle className="spin" size={17} />
        ) : (
          <ArrowRight size={17} />
        )}{" "}
        {locale === "ru" ? "Войти в Kairon" : "Sign in to Kairon"}
      </Button>
    </form>
  );
}
