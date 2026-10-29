import Link from "next/link";
import { CalendarDays, Monitor, CheckCircle2 } from "lucide-react";
import { ContinueLearning } from "@/components/day-progress";
import { learningDays, learningStages, totalDays } from "@/lib/day-plan";

export default function Home() {
  return (
    <div className="page-container day-home">
      <section className="first-visit-hero">
        <span className="eyebrow">БЕСПЛАТНЫЙ ПЛАН ДЛЯ НАЧИНАЮЩЕГО</span>
        <h1>
          Кибербезопасность.
          <br />
          <span>Начнём с первого дня.</span>
        </h1>
        <p>
          Сначала подготовишь Kali Linux. Затем разберёшься в основах и
          перейдёшь к практике. В каждом занятии уже указано, что сделать, что
          должно получиться и куда идти дальше.
        </p>
        <div className="route-facts">
          <span>
            <CalendarDays size={17} />
            {totalDays} учебных дней
          </span>
          <span>
            <Monitor size={17} />
            Практика на своём компьютере
          </span>
          <span>
            <CheckCircle2 size={17} />
            Все уроки открыты
          </span>
        </div>
      </section>
      <ContinueLearning days={learningDays} />
      <div className="home-plan-link">
        <Link href="/study-plan">Посмотреть весь план по дням →</Link>
      </div>
      <section className="how-to-study" id="how-to-study">
        <h2>Как проходит занятие</h2>
        <ol>
          <li>
            <strong>Открой свой день.</strong>
            <p>Прочитай цель и подготовь то, что нужно для занятия.</p>
          </li>
          <li>
            <strong>Пройди уроки по порядку.</strong>
            <p>
              Читай объяснение, выполняй действия у себя и сравнивай результат с
              примером.
            </p>
          </li>
          <li>
            <strong>Проверь понимание и продолжай.</strong>
            <p>
              Правильный ответ сохраняет отметку в этом браузере. Следующий шаг
              находится внизу урока.
            </p>
          </li>
        </ol>
        <p className="program-note">
          Обычно занятие занимает 1–2 часа. Это ориентир: один учебный день
          можно проходить несколько вечеров. При пяти занятиях в неделю весь
          план займёт примерно 12 недель.
        </p>
      </section>
      <details className="route-preview">
        <summary>Что будет дальше по плану</summary>
        <ol>
          {learningStages.map((stage) => (
            <li key={stage.id}>
              <span>
                Дни {stage.firstDay}–{stage.lastDay}
              </span>
              <strong>{stage.title}</strong>
              <p>{stage.summary}</p>
            </li>
          ))}
        </ol>
      </details>
      <p className="home-materials-note">
        Нужно повторить отдельную тему?{" "}
        <Link href="/materials">Открой дополнительные материалы</Link>. Основное
        обучение идёт по дням выше.
      </p>
    </div>
  );
}
