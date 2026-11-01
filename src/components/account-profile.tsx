"use client";
import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  reloadAfterAccountChange,
  useLearningProgress,
  ProgressFeedback,
} from "./learning-account";
import { Button } from "./ui/button";
import { getLearningDay, learningDays } from "@/lib/day-plan";

export function AccountProfile() {
  const {
    user,
    status,
    completedLessonIds,
    completedDays,
    bookmark,
    guestLessonIds,
    saving,
    mutate,
    importGuest,
  } = useLearningProgress();
  const [message, setMessage] = useState("");
  const [leaving, setLeaving] = useState(false);
  if (status === "loading")
    return (
      <section className="account-card">
        <h1>Мой прогресс</h1>
        <p role="status">Загружаем ваши отметки…</p>
      </section>
    );
  if (!user)
    return (
      <section className="account-card">
        <h1>Сохраните своё место</h1>
        <p>
          Войдите, чтобы открыть личные отметки и закладку с любого устройства.
          Учиться можно и без аккаунта.
        </p>
        <Button asChild>
          <Link href="/login">Войти или создать аккаунт</Link>
        </Button>
        <ProgressFeedback />
      </section>
    );
  const completedDaySet = new Set(completedDays);
  const completedLessonSet = new Set(completedLessonIds);
  const doneDays = learningDays.filter(
    (day) =>
      completedDaySet.has(day.day) ||
      day.lessonIds.every((id) => completedLessonSet.has(id)),
  ).length;
  return (
    <section className="account-card profile-card">
      <span className="eyebrow">ЛИЧНЫЙ АККАУНТ</span>
      <h1>Мой прогресс</h1>
      <p>
        {user.name} · {user.email}
      </p>
      <div className="profile-stats">
        <div>
          <strong>{doneDays} / 60</strong>
          <span>дней отмечено</span>
        </div>
        <div>
          <strong>{completedLessonIds.length} / 106</strong>
          <span>самопроверок</span>
        </div>
      </div>
      <p>
        Отметки хранятся в вашем аккаунте. На другом компьютере или телефоне
        войдите с этой же почтой. Личные отметки дней и ответы на самопроверки
        учитываются отдельно.
      </p>
      <Button asChild>
        <Link href="/study-plan">Продолжить обучение</Link>
      </Button>
      <div className="profile-section">
        <h2>Место остановки</h2>
        {bookmark ? (
          <>
            <p>
              День {bookmark.day}. {getLearningDay(bookmark.day)?.title}
            </p>
            <p className="bookmark-note">
              {bookmark.note || "Заметка не добавлена."}
            </p>
            <Link
              href={
                bookmark.lessonId
                  ? `/learn/${bookmark.lessonId}`
                  : `/days/${bookmark.day}`
              }
            >
              Открыть закладку
            </Link>
            <button
              className="subtle-link"
              disabled={saving}
              onClick={() => void mutate({ action: "clear-bookmark" })}
            >
              Убрать закладку и заметку
            </button>
          </>
        ) : (
          <p>
            Откройте нужный день или урок и нажмите «Сохранить место». Можно
            добавить короткую заметку о следующем шаге.
          </p>
        )}
      </div>
      {guestLessonIds.length > 0 && (
        <div className="profile-section">
          <h2>Прежние отметки браузера</h2>
          <p>
            В этом браузере есть {guestLessonIds.length} отметок без аккаунта.
            Они могли принадлежать другому человеку, если компьютер общий.
            Переносите их, только если учились здесь вы. Они добавятся к вашим
            отметкам; существующие не исчезнут.
          </p>
          <Button
            variant="outline"
            disabled={saving}
            onClick={async () => {
              if (await importGuest())
                setMessage("Гостевые отметки перенесены в ваш аккаунт.");
            }}
          >
            Это мои отметки — перенести
          </Button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
      <ProgressFeedback />
      <div className="account-actions">
        <Link href="/privacy">Как хранятся мои данные</Link>
        <Button
          variant="outline"
          disabled={leaving}
          onClick={async () => {
            setLeaving(true);
            try {
              await signOut({ redirect: false });
              reloadAfterAccountChange();
            } catch {
              setMessage("Не удалось выйти. Попробуйте ещё раз.");
              setLeaving(false);
            }
          }}
        >
          Выйти из аккаунта
        </Button>
      </div>
      <p className="account-help">
        На общем компьютере выходите после занятия. Выход не удаляет ваши
        серверные отметки. Заметка предназначена для учебных напоминаний: не
        сохраняйте в ней пароли и другие секреты.
      </p>
    </section>
  );
}
