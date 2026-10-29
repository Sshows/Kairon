import Link from "next/link";
import { getLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Этика и правила" };
export default async function Ethics() {
  const locale = await getLocale();
  const ru = locale === "ru";
  return (
    <div className="page-container document-page">
      <Link href="/study-plan" className="back-link">
        {ru ? "← К маршруту по дням" : "← Back to the daily route"}
      </Link>
      <span className="eyebrow">
        {ru ? "ПРАВИЛА УЧЕБНОЙ ПРАКТИКИ" : "TRAINING PRACTICE RULES"}
      </span>
      <h1>
        {ru
          ? "Навыки — с ответственностью."
          : "Skills come with responsibility."}
      </h1>
      <div className="prose-content">
        <p>
          {ru
            ? "На Kairon учимся понимать и защищать системы. Все уроки бесплатны и открыты без аккаунта. Перед первым опытом прочитай, где проходит практика и какие у неё границы."
            : "Kairon teaches how to understand and protect systems. All lessons are free and open without an account. Before your first exercise, read where practice takes place and what its boundaries are."}
        </p>
        <h2>{ru ? "Только с разрешением" : "Only with permission"}</h2>
        <p>
          {ru
            ? "Выполняй опыты только на своих учебных файлах и локальных приложениях из урока. Например, запущенный тобой Juice Shop — учебная цель, а настоящий интернет-магазин в соседней вкладке — нет. Для любой другой системы заранее получи явное разрешение владельца с понятными границами проверки. Доступность сайта в Интернете не означает разрешение на тестирование."
            : "Use only your own training files and the local applications specified in the lesson. Your local Juice Shop is a training target; a real online shop in another tab is not. For other systems, obtain explicit owner permission and an agreed scope first. Public access does not imply permission to test."}
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
              ? "Если опыт запущен внутри Kali, не меняй сетевой режим и не открывай его в Интернет без указания урока. Не используй чужие сессии и устройства."
              : "When an exercise runs inside Kali, do not change its network mode or expose it to the Internet outside the lesson instructions. Do not access other people’s sessions or devices."}
          </li>
          <li>
            {ru
              ? "Не загружай реальные пароли, ключи, персональные данные или вредоносные файлы."
              : "Do not upload real passwords, keys, personal data, or harmful files."}
          </li>
          <li>
            {ru
              ? "Используй учебные данные из набора. Если создаёшь свои примеры, придумывай имена, адреса и пароли специально для практики."
              : "Use the provided training data. When making your own examples, invent names, addresses and passwords specifically for practice."}
          </li>
        </ul>
        <h2>
          {ru
            ? "Белая шляпа помогает исправлять"
            : "A white hat helps fix problems"}
        </h2>
        <p>
          {ru
            ? "Если заметил ошибку самой платформы, остановись и сообщи о ней в репозитории проекта. Укажи адрес страницы, своё действие и полученный результат. Не публикуй чужие данные, пароли или другие секреты."
            : "If you find a problem in Kairon, stop and report it in the project repository. Include the page, your action and the result. Do not publish other people’s data, passwords or secrets."}
        </p>
        <h2>{ru ? "Этика и закон" : "Ethics and the law"}</h2>
        <p>
          {ru
            ? "Эти правила задают границы работы на платформе. Перед практикой вне неё проверь требования своей страны по официальным источникам или с юристом. Разрешение на учебную лабораторию действует только внутри её задания."
            : "These rules define the scope of platform use. Before working elsewhere, check your jurisdiction's requirements using official sources or a legal professional. Permission for a training lab applies only within its assignment."}
        </p>
      </div>
      <Button asChild>
        <Link href="/study-plan">
          {ru ? "Вернуться к маршруту по дням" : "Return to the daily route"} →
        </Link>
      </Button>
    </div>
  );
}
