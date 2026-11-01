"use client";
import { useState } from "react";
import Link from "next/link";
import { useLearningProgress, ProgressFeedback } from "./learning-account";
import { Button } from "./ui/button";

export function StudyBookmark({
  day,
  lessonId = null,
}: {
  day: number;
  lessonId?: string | null;
}) {
  const { user, status, bookmark, completedDays, saving, mutate } =
    useLearningProgress();
  // Re-key the editor on account changes so an unsaved note cannot cross accounts.
  if (!user)
    return status === "guest" ? (
      <p className="account-inline">
        <Link href="/login">Войдите</Link>, чтобы сохранить место остановки и
        заметку между устройствами.
      </p>
    ) : null;
  return (
    <BookmarkEditor
      key={user.id + ":" + day + ":" + lessonId}
      day={day}
      lessonId={lessonId}
      initialNote={
        bookmark?.day === day && bookmark.lessonId === lessonId
          ? bookmark.note
          : ""
      }
    >
      {lessonId === null && (
        <label className="day-completion">
          <input
            type="checkbox"
            checked={completedDays.includes(day)}
            disabled={saving}
            onChange={(event) =>
              void mutate({
                action: "day",
                day,
                complete: event.target.checked,
              })
            }
          />
          Я закончил день {day}
        </label>
      )}
      {lessonId === null && (
        <p className="account-help">
          Это ваша личная отметка. Самопроверки отдельных уроков сохраняются
          отдельно.
        </p>
      )}
    </BookmarkEditor>
  );
}

function BookmarkEditor({
  day,
  lessonId,
  initialNote,
  children,
}: {
  day: number;
  lessonId: string | null;
  initialNote: string;
  children: React.ReactNode;
}) {
  const { saving, mutate, bookmark } = useLearningProgress();
  const [note, setNote] = useState(initialNote);
  const [saved, setSaved] = useState(false);
  const current = bookmark?.day === day && bookmark.lessonId === lessonId;
  return (
    <section className="study-bookmark" aria-label="Место остановки">
      {children}
      <details>
        <summary>
          {current ? "Закладка сохранена здесь" : "Сохранить место и заметку"}
        </summary>
        <p>
          Например: «Прочитал до проверки портов. В следующий раз повторить
          команду из шага 3». На главной появится ссылка на это место. Новая
          закладка заменит предыдущую.
        </p>
        <label>
          Моя заметка
          <textarea
            maxLength={1000}
            rows={3}
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              setSaved(false);
            }}
          />
        </label>
        <Button
          disabled={saving}
          onClick={async () => {
            setSaved(await mutate({ action: "bookmark", day, lessonId, note }));
          }}
        >
          Сохранить место
        </Button>
        {saved && <p role="status">Закладка и заметка сохранены в аккаунте.</p>}
      </details>
      <ProgressFeedback />
    </section>
  );
}
