"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3 } from "lucide-react";
import { useLearningProgress, ProgressFeedback } from "./learning-account";
import { StudyBookmark } from "./study-bookmark";
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
  const {
    completedLessonIds,
    completedDays,
    bookmark,
    user,
    ready,
    storageAvailable,
  } = useLearningProgress();
  const completed = useMemo(
    () => new Set(completedLessonIds),
    [completedLessonIds],
  );
  const completedDaySet = useMemo(
    () => new Set(completedDays),
    [completedDays],
  );
  const totalLessons = useMemo(
    () => days.reduce((sum, item) => sum + item.lessonIds.length, 0),
    [days],
  );
  const current = days.find(
    (day) =>
      !completedDaySet.has(day.day) &&
      day.lessonIds.some((id) => !completed.has(id)),
  );
  const day =
    days.find((item) => item.day === bookmark?.day) ?? current ?? days[0];
  const started =
    ready &&
    (completed.size > 0 || completedDaySet.size > 0 || Boolean(bookmark));
  const finished = ready && !current && !bookmark;
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
      <Button asChild>
        <Link
          href={
            finished
              ? "/study-plan"
              : bookmark?.lessonId
                ? `/learn/${bookmark.lessonId}`
                : `/days/${day.day}`
          }
        >
          {finished
            ? "Открыть весь план"
            : bookmark
              ? "Вернуться к закладке"
              : started
                ? `Продолжить день ${day.day}`
                : "Начать первый день"}
          <ArrowRight size={17} />
        </Link>
      </Button>
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
      {started && (
        <p className="device-progress-note">
          Отмечено {completed.size} из {totalLessons} самопроверок{" "}
          {user ? "в аккаунте" : "на этом устройстве"}.
        </p>
      )}
      {bookmark?.note && (
        <p className="bookmark-note">Моя заметка: {bookmark.note}</p>
      )}
      {!user && ready && (
        <p className="device-progress-note">
          <Link href="/login">
            Войти и сохранять прогресс между устройствами
          </Link>
        </p>
      )}
      <ProgressFeedback />
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
  const { completedLessonIds, completedDays, ready } = useLearningProgress();
  const complete = new Set(completedLessonIds);
  const next = lessons.find((lesson) => !complete.has(lesson.id));
  const finished = ready && (!next || completedDays.includes(day.day));
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
          День отмечен. Перед следующим занятием сверь свой результат с целью
          дня.
        </p>
      )}
      <StudyBookmark day={day.day} />
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
  const {
    completedLessonIds,
    completedDays,
    user,
    ready,
    saving,
    storageAvailable,
    resetProgress,
  } = useLearningProgress();
  const [confirmReset, setConfirmReset] = useState(false);
  const complete = useMemo(
    () => new Set(completedLessonIds),
    [completedLessonIds],
  );
  const completedDaySet = useMemo(
    () => new Set(completedDays),
    [completedDays],
  );
  const daysByStage = useMemo(() => {
    const map = new Map<string, DayOverview[]>();
    for (const day of days) {
      const list = map.get(day.stageId);
      if (list) list.push(day);
      else map.set(day.stageId, [day]);
    }
    return map;
  }, [days]);
  const current = days.find(
    (day) =>
      !completedDaySet.has(day.day) &&
      day.lessonIds.some((id) => !complete.has(id)),
  );
  const finishedDays = days.filter(
    (day) =>
      completedDaySet.has(day.day) ||
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
            {(daysByStage.get(stage.id) ?? []).map((day) => {
              const done =
                ready &&
                (completedDaySet.has(day.day) ||
                  day.lessonIds.every((id) => complete.has(id)));
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
          {user
            ? "Вы вошли в аккаунт. Пройденные самопроверки, личные отметки дней и закладка сохраняются на сервере. Войдите с той же почтой на другом устройстве — они появятся там. Гостевые отметки можно отдельно перенести в разделе «Мой прогресс»."
            : "Войдите в подтверждённый аккаунт, чтобы продолжить обучение и открыть свои отметки."}{" "}
          Отметки помогают вести обучение и не подтверждают выполнение практики
          в Kali.
        </p>
        {ready && storageAvailable === false && (
          <p>
            Хранилище сейчас недоступно: изменения сохраняются только до
            обновления страницы.
          </p>
        )}
        {!confirmReset ? (
          <button className="subtle-link" onClick={() => setConfirmReset(true)}>
            {user
              ? "Сбросить мои отметки в аккаунте"
              : "Сбросить отметки на этом устройстве"}
          </button>
        ) : (
          <div className="reset-progress-confirm">
            <p>
              {user
                ? "Сбросить отметки дней и самопроверок в вашем аккаунте на всех устройствах? Закладка и заметка останутся."
                : "Удалить все местные отметки? Уроки и скачанные файлы останутся."}
            </p>
            <Button
              variant="outline"
              disabled={saving}
              onClick={async () => {
                if (await resetProgress()) setConfirmReset(false);
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
      <ProgressFeedback />
    </div>
  );
}
