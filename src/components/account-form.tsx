"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "./ui/button";
import {
  announceAccountChange,
  reloadAfterAccountChange,
  useLearningProgress,
} from "./learning-account";

type Mode = "login" | "register" | "reset" | "verify" | "recover";
const titles: Record<Mode, string> = {
  login: "Войти в Kairon",
  register: "Создать бесплатный аккаунт",
  reset: "Восстановить пароль",
  verify: "Подтвердить почту",
  recover: "Установить новый пароль",
};
export function AccountForm() {
  const { user, registrationAvailable, status } = useLearningProgress();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const changeMode = (next: Mode) => {
    setMode(next);
    setError("");
    setMessage("");
    setPassword("");
    setCode("");
    setChallengeId("");
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      if (mode === "login") {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (!result || result.error)
          throw new Error(
            "Не удалось войти. Проверьте почту и пароль. Если почта ещё не подтверждена или пароль забыт, воспользуйтесь восстановлением. После нескольких попыток подождите 15 минут.",
          );
        reloadAfterAccountChange();
        return;
      }
      const input =
        mode === "register"
          ? { action: mode, email, name, password }
          : mode === "reset"
            ? { action: mode, email }
            : mode === "verify"
              ? { action: mode, challengeId, code }
              : { action: mode, challengeId, code, password };
      const response = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Не удалось выполнить запрос.");
      setMessage(data.message);
      if (data.challengeId) {
        setChallengeId(data.challengeId);
        setMode(mode === "register" ? "verify" : "recover");
        setPassword("");
      } else {
        setMode("login");
        setCode("");
        setPassword("");
        announceAccountChange();
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Проверьте соединение и повторите запрос.",
      );
    } finally {
      setPending(false);
    }
  }
  if (user)
    return (
      <section className="account-card">
        <h1>Вы уже вошли</h1>
        <p>{user.email}</p>
        <Button asChild>
          <Link href="/profile">Открыть мой прогресс</Link>
        </Button>
      </section>
    );
  const codeMode = mode === "verify" || mode === "recover";
  return (
    <section className="account-card">
      <span className="eyebrow">БЕСПЛАТНЫЙ АККАУНТ</span>
      <h1>{titles[mode]}</h1>
      <p>
        {codeMode
          ? `Код отправляется на ${email}. Введите 6 цифр из самого нового письма. Он действует 10 минут.`
          : "Сохраняйте пройденные дни, место остановки и заметку. После входа с другого устройства вы увидите свои отметки."}
      </p>
      {status !== "loading" && !registrationAvailable && (
        <p className="account-feedback">
          Отправка новых кодов сейчас недоступна. Уроки остаются открытыми.
        </p>
      )}
      <form onSubmit={submit} className="account-form">
        {!codeMode && (
          <label>
            Электронная почта
            <input
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
        )}
        {mode === "register" && (
          <label>
            Как к вам обращаться
            <input
              autoComplete="nickname"
              required
              maxLength={60}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        )}
        {codeMode && (
          <label>
            Код из письма
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, ""))
              }
            />
          </label>
        )}
        {(mode === "login" || mode === "register" || mode === "recover") && (
          <label>
            {mode === "recover" ? "Новый пароль" : "Пароль"}
            <input
              type="password"
              aria-label={mode === "recover" ? "Новый пароль" : "Пароль"}
              aria-describedby="password-requirements"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={12}
              maxLength={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <small id="password-requirements">
              От 12 символов. Длинную фразу легче запомнить. Максимум — 72
              байта: русская буква обычно занимает 2 байта.
            </small>
          </label>
        )}
        {message && (
          <p className="account-message" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="account-feedback" role="alert">
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={pending || (mode !== "login" && !registrationAvailable)}
        >
          {pending
            ? "Подождите…"
            : mode === "login"
              ? "Войти"
              : mode === "verify"
                ? "Подтвердить почту"
                : mode === "recover"
                  ? "Сохранить новый пароль"
                  : "Получить код на почту"}
        </Button>
      </form>
      {codeMode && (
        <p className="account-help">
          Проверьте папку «Спам» и правильность адреса. Если письма нет,
          подождите минуту, вернитесь к форме и запросите новый код. Прежний код
          после повторной отправки не работает.
        </p>
      )}
      <div className="account-actions">
        {mode !== "login" && (
          <button
            disabled={pending}
            className="subtle-link"
            onClick={() => changeMode("login")}
          >
            Уже есть аккаунт — войти
          </button>
        )}
        {(mode === "login" || mode === "verify") && (
          <button
            disabled={pending}
            className="subtle-link"
            onClick={() => changeMode("register")}
          >
            {mode === "verify"
              ? "Запросить новый код регистрации"
              : "Создать аккаунт"}
          </button>
        )}
        {(mode === "login" || codeMode) && (
          <button
            disabled={pending}
            className="subtle-link"
            onClick={() => changeMode("reset")}
          >
            {mode === "recover"
              ? "Запросить новый код восстановления"
              : "Забыли пароль?"}
          </button>
        )}
        <Link href="/study-plan">Учиться без входа</Link>
      </div>
      <p className="account-help">
        Почта нужна для входа и восстановления доступа. Пароль хранится в виде
        защищённого хеша. Отметки и заметка видны в вашем аккаунте.{" "}
        <Link href="/privacy">Как хранятся данные</Link>.
      </p>
    </section>
  );
}
