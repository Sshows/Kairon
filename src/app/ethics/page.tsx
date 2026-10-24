import Link from "next/link";
import { getLocale } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/access";
import { acceptRules } from "@/app/actions";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Этика и правила" };
export default async function Ethics() {
  const [locale, user] = await Promise.all([getLocale(), getCurrentUser()]);
  const ru = locale === "ru";
  return (
    <div className="page-container document-page">
      <span className="eyebrow">WHITE HAT / RULES V1</span>
      <h1>
        {ru
          ? "Навыки — с ответственностью."
          : "Skills come with responsibility."}
      </h1>
      <div className="prose-content">
        <p>
          {ru
            ? "Kairon создаётся для обучения защите систем. Перед первой практикой каждый участник принимает эти правила."
            : "Kairon is being built to teach system security. Every learner accepts these rules before starting practical work."}
        </p>
        <h2>{ru ? "Только с разрешением" : "Only with permission"}</h2>
        <p>
          {ru
            ? "Проверяй только свои учебные цели в лаборатории Kairon. Для любой другой системы заранее получи явное разрешение владельца с понятными границами проверки. Доступность сайта в Интернете не означает разрешение на тестирование."
            : "Test only your assigned Kairon training targets. For any other system, obtain explicit owner permission and an agreed testing scope first. A website being publicly accessible is not permission to test it."}
        </p>
        <h2>
          {ru
            ? "Лаборатория — отдельная среда"
            : "The lab is a separate environment"}
        </h2>
        <ul>
          <li>
            {ru
              ? "Не переноси учебные атаки на реальные сайты, людей и организации."
              : "Do not take lab attacks to real websites, people, or organizations."}
          </li>
          <li>
            {ru
              ? "Не пытайся выйти из учебного окружения, попасть на хост или в чужую сессию."
              : "Do not attempt to escape the lab, access its host, or enter another learner's session."}
          </li>
          <li>
            {ru
              ? "Не загружай реальные пароли, ключи, персональные данные или вредоносные файлы."
              : "Do not upload real passwords, keys, personal data, or harmful files."}
          </li>
          <li>
            {ru
              ? "Используй только выданные синтетические данные и разрешённые учебные инструменты."
              : "Use only assigned synthetic data and approved training tools."}
          </li>
        </ul>
        <h2>
          {ru
            ? "Белая шляпа помогает исправлять"
            : "A white hat helps fix problems"}
        </h2>
        <p>
          {ru
            ? "Если заметил ошибку самой платформы, остановись и сообщи администратору через канал, по которому получил аккаунт. Опиши шаги без публикации чужих данных."
            : "If you find a problem in Kairon itself, stop and contact the administrator through the channel that provided your account. Describe the steps without publishing anyone else's data."}
        </p>
        <h2>{ru ? "Этика и закон" : "Ethics and the law"}</h2>
        <p>
          {ru
            ? "Эти правила задают границы работы на платформе. Перед практикой вне неё проверь требования своей страны по официальным источникам или с юристом. Разрешение на учебную лабораторию действует только внутри её задания."
            : "These rules define the scope of platform use. Before working elsewhere, check your jurisdiction's requirements using official sources or a legal professional. Permission for a training lab applies only within its assignment."}
        </p>
      </div>
      {user ? (
        user.ethicsAcceptedAt ? (
          <div className="notice">
            <p>
              {ru
                ? "Ты уже принял правила версии 1."
                : "You have accepted version 1 of the rules."}
            </p>
          </div>
        ) : (
          <form action={acceptRules} className="rules-form">
            <label>
              <input type="checkbox" name="accept" required />
              <span>
                {ru
                  ? "Я прочитал правила и обязуюсь практиковаться только в разрешённых учебных средах."
                  : "I have read the rules and agree to practice only in authorized training environments."}
              </span>
            </label>
            <Button type="submit">
              {ru ? "Принять правила" : "Accept the rules"}
            </Button>
          </form>
        )
      ) : (
        <div className="notice">
          <p>
            {ru
              ? "Чтобы сохранить принятие правил, "
              : "To save your acceptance, "}
            <Link className="subtle-link" href="/login">
              {ru ? "войди в аккаунт" : "sign in"} →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
