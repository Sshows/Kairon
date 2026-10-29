"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3 } from "lucide-react";
import { useLocalProgress } from "@/lib/local-progress";
import { Button } from "./ui/button";

export type DayOverview = {
  day: number;
  title: string;
  summary: string;
  minutes: number;
  lessonIds: string[];
  stageId: string;
};
type StageOverview = {
  id: string;
  title: string;
  summary: string;
  firstDay: number;
  lastDay: number;
};

export function ContinueLearning({
  days,
  compact = false,
}: {
  days: DayOverview[];
  compact?: boolean;
}) {
  const { completedLessonIds, ready, storageAvailable } = useLocalProgress();
  const completed = new Set(completedLessonIds);
  const current = days.find((day) =>
    day.lessonIds.some((id) => !completed.has(id)),
  );
  const day = current ?? days[0];
  const started = ready && completed.size > 0;
  const finished = ready && !current;
  return (
    <section
      className={`continue-learning ${compact ? "continue-compact" : ""}`}
      aria-label="Следующее занятие"
    >
      <span className="eyebrow">
        {finished
          ? "МАРШРУТ ПРОЙДЕН"
          : started
            ? "ТВОЙ СЛЕДУЮЩИЙ ШАГ"
            : "ТВОЯ ПЕРВАЯ ЗАДАЧА"}
      </span>
      <h2>
        {finished
          ? "Все занятия отмечены. Можно вернуться к любому дню."
          : `День ${day.day}. ${day.title}`}
      </h2>
      {!compact && (
        <p>
          {finished
            ? "Повтори трудную тему или выбери следующий проект в дополнительных материалах."
            : day.summary}
        </p>
      )}
      {!finished && (
        <div className="day-time">
          <Clock3 size={16} />
          <span>
            Ориентир: {day.minutes} мин · можно разделить на несколько подходов
          </span>
        </div>
      )}
      <Button asChild>
        <Link href={finished ? "/study-plan" : `/days/${day.day}`}>
          {finished
            ? "Открыть весь план"
            : started
              ? `Продолжить день ${day.day}`
              : "Начать первый день"}
          <ArrowRight size={17} />
        </Link>
      </Button>
      {started && (
        <p className="device-progress-note">
          Отмечено {completed.size} из{" "}
          {days.flatMap((item) => item.lessonIds).length} уроков на этом
          устройстве.
        </p>
      )}
      {ready && storageAvailable === false && (
        <p className="device-progress-note" role="status">
          Браузер не разрешил сохранять отметки. Уроки работают; после закрытия
          страницы отметки могут потеряться.
        </p>
      )}
    </section>
  );
}

export function DayLessonList({
  day,
  lessons,
  finalDay,
}: {
  day: DayOverview;
  finalDay: number;
  lessons: { id: string; title: string; minutes: number; summary: string }[];
}) {
  const { completedLessonIds, ready } = useLocalProgress();
  const complete = new Set(completedLessonIds);
  const next = lessons.find((lesson) => !complete.has(lesson.id));
  const finished = ready && !next;
  return (
    <section aria-label="Уроки этого дня" className="daily-lesson-list">
      <h2>Делай по порядку</h2>
      <ol>
        {lessons.map((lesson, index) => (
          <li
            key={lesson.id}
            className={ready && complete.has(lesson.id) ? "is-complete" : ""}
          >
            <span className="daily-lesson-number">
              {ready && complete.has(lesson.id) ? (
                <CheckCircle2 size={23} aria-label="Завершён" />
              ) : (
                index + 1
              )}
            </span>
            <div>
              <h3>
                <Link href={`/learn/${lesson.id}`}>{lesson.title}</Link>
              </h3>
              <p>{lesson.summary}</p>
              <span className="day-time">Примерно {lesson.minutes} мин</span>
            </div>
          </li>
        ))}
      </ol>
      <Button asChild>
        <Link
          href={
            finished && day.day < finalDay
              ? `/days/${day.day + 1}`
              : finished
                ? "/study-plan"
                : `/learn/${(next ?? lessons[0]).id}`
          }
        >
          {finished
            ? day.day < finalDay
              ? `Перейти к дню ${day.day + 1}`
              : "Посмотреть свой маршрут"
            : next?.id === lessons[0].id
              ? "Открыть первый урок этого дня"
              : "Продолжить занятие"}
          <ArrowRight size={17} />
        </Link>
      </Button>
      {finished && (
        <p className="device-progress-note" role="status">
          Самопроверки этого дня пройдены. Перед следующим занятием сверь свой
          результат с целью дня.
        </p>
      )}
    </section>
  );
}

export function DayPlanList({
  days,
  stages,
}: {
  days: DayOverview[];
  stages: StageOverview[];
}) {
  const { completedLessonIds, ready, storageAvailable, resetProgress } =
    useLocalProgress();
  const [confirmReset, setConfirmReset] = useState(false);
  const complete = new Set(completedLessonIds);
  const current = days.find((day) =>
    day.lessonIds.some((id) => !complete.has(id)),
  );
  const finishedDays = days.filter((day) =>
    day.lessonIds.every((id) => complete.has(id)),
  ).length;
  return (
    <div className="day-plan-list">
      <div className="day-progress-overview" aria-live="polite">
        <span>
          Пройдено{" "}
          <strong>
            {ready ? finishedDays : 0} из {days.length} дней
          </strong>
        </span>
        <progress
          aria-label="Прогресс по дням"
          value={ready ? finishedDays : 0}
          max={days.length}
        />
      </div>
      {stages.map((stage, index) => (
        <details
          className="day-stage"
          key={stage.id}
          open={stage.id === (current ?? days[0]).stageId}
        >
          <summary>
            <span className="stage-index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>
              <strong>{stage.title}</strong>
              <small>
                Дни {stage.firstDay}–{stage.lastDay}
              </small>
            </span>
            <span className="stage-toggle">+</span>
          </summary>
          <p>{stage.summary}</p>
          <ol className="day-cards">
            {days
              .filter((day) => day.stageId === stage.id)
              .map((day) => {
                const done =
                  ready && day.lessonIds.every((id) => complete.has(id));
                return (
                  <li key={day.day}>
                    <Link
                      href={`/days/${day.day}`}
                      aria-current={
                        current?.day === day.day ? "step" : undefined
                      }
                      className={done ? "day-card done" : "day-card"}
                    >
                      <span className="day-card-number">День {day.day}</span>
                      <span className="day-card-body">
                        <strong>{day.title}</strong>
                        <small>{day.summary}</small>
                      </span>
                      <span className="day-card-time">
                        {done ? (
                          <>
                            <CheckCircle2 size={16} />
                            Пройден
                          </>
                        ) : (
                          `${day.minutes} мин`
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
          </ol>
        </details>
      ))}
      <details className="device-progress-settings">
        <summary>Как сохраняются отметки</summary>
        <p>
          После правильной самопроверки урок отмечается в этом браузере. Данные
          не отправляются в аккаунт. Очистка данных сайта, другой браузер или
          устройство не переносят отметки. Это отметки самопроверки, а не оценка
          выполнения практики.
        </p>
        {ready && storageAvailable === false && (
          <p>
            Хранилище сейчас недоступно: изменения сохраняются только до
            обновления страницы.
          </p>
        )}
        {!confirmReset ? (
          <button className="subtle-link" onClick={() => setConfirmReset(true)}>
            Сбросить отметки на этом устройстве
          </button>
        ) : (
          <div className="reset-progress-confirm">
            <p>
              Удалить все местные отметки? Уроки и скачанные файлы останутся.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                resetProgress();
                setConfirmReset(false);
              }}
            >
              Да, сбросить отметки
            </Button>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Отмена
            </Button>
          </div>
        )}
      </details>
    </div>
  );
}
