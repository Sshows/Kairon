import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
  Terminal,
} from "lucide-react";
import { getCurrentUser } from "@/lib/access";
import { getProgress, isUnlocked } from "@/lib/learning";
import { lessons } from "@/lib/lessons";
import { Button } from "./ui/button";
export async function StarterPath() {
  const user = await getCurrentUser();
  const progress = user ? await getProgress(user.id) : [];
  const completed = new Set(
    progress.filter((p) => p.completedAt).map((p) => p.lessonId),
  );
  const next = lessons.find((l) => !completed.has(l.id)) ?? lessons[0];
  return (
    <div className="page-container document-page starter-path">
      <Link href="/#paths" className="back-link">
        <ArrowLeft size={16} />
        Все направления
      </Link>
      <span className="eyebrow">PATH 00 · УЖЕ ДОСТУПЕН</span>
      <h1>Старт с нуля</h1>
      <p className="lead">
        10 коротких уроков с практикой. Читай объяснение, выполняй команду,
        проверяй результат. Можно работать в браузерном тренажёре или в своей
        Kali Linux.
      </p>
      <div className="course-summary">
        <span>
          <Terminal size={18} />
          Учебный терминал
        </span>
        <span>
          {lessons.reduce((n, l) => n + l.minutes, 0)} минут по программе
        </span>
        <span>До {lessons.reduce((n, l) => n + l.xp, 0)} XP</span>
      </div>
      <div className="course-actions">
        <Button asChild>
          <Link href={`/learn/${next.id}`}>
            {completed.size ? "Продолжить обучение" : "Начать первый урок"}
            <ArrowRight size={17} />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/terminal">Попробовать терминал</Link>
        </Button>
      </div>
      {user && (
        <div className="course-progress">
          <span>
            Пройдено {completed.size} из {lessons.length}
          </span>
          <progress value={completed.size} max={lessons.length} />
        </div>
      )}
      <p className="program-note">
        Практика и теория доступны для ознакомления. В аккаунте задания
        засчитываются по порядку, после принятия правил. Каждый урок начинает с
        отдельной копии виртуальных файлов. Установка Kali и расширенные
        лаборатории будут добавлены отдельно.
      </p>
      <div className="course-lessons">
        {lessons.map((lesson, index) => (
          <Link
            key={lesson.id}
            href={`/learn/${lesson.id}`}
            className={completed.has(lesson.id) ? "completed" : ""}
          >
            <span className="course-lesson-number">
              {completed.has(lesson.id) ? (
                <CheckCircle2 size={20} />
              ) : (
                String(index + 1).padStart(2, "0")
              )}
            </span>
            <div>
              <span className="eyebrow">{lesson.module}</span>
              <h2>{lesson.title}</h2>
              <p>{lesson.summary}</p>
              <span className="course-lesson-meta">
                {lesson.minutes} мин · {lesson.xp} XP ·{" "}
                {lesson.kind === "terminal"
                  ? "Терминал / своя Kali"
                  : "Вопрос с практикой"}
              </span>
            </div>
            {user && !isUnlocked(lesson.id, completed) ? (
              <LockKeyhole size={17} />
            ) : (
              <ArrowRight size={17} />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
