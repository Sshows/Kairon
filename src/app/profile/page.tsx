import Link from "next/link";
import { Compass, ShieldCheck, UserRound } from "lucide-react";
import { requireUser } from "@/lib/access";
import { getLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { getProgress } from "@/lib/learning";
import { lessons, lessonIds, getCourseLessons } from "@/lib/lessons";
import { learningPaths } from "@/lib/learning-paths";
export const metadata = { title: "Профиль" };
export default async function Profile() {
  const user = await requireUser(),
    locale = await getLocale();
  const progress = await getProgress(user.id);
  const completed = new Set(
    progress
      .filter((p) => p.completedAt && lessonIds.has(p.lessonId))
      .map((p) => p.lessonId),
  );
  const totalXp = progress.reduce((sum, p) => sum + p.awardedXp, 0);
  const next = lessons.find((l) => !completed.has(l.id));
  return (
    <div className="page-container document-page">
      <span className="eyebrow">YOUR ACCOUNT</span>
      <h1>{locale === "ru" ? "Твоё пространство" : "Your workspace"}</h1>
      <div className="profile-card">
        <span className="login-icon">
          <UserRound size={26} />
        </span>
        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <span className="muted-tag">{user.role}</span>
        </div>
      </div>
      <section className="notice">
        <ShieldCheck size={21} />
        <div>
          <h2>
            {locale === "ru"
              ? "Правила безопасной практики"
              : "Safe practice rules"}
          </h2>
          <p>
            {user.ethicsAcceptedAt
              ? locale === "ru"
                ? "Правила приняты. Спасибо за ответственное отношение к практике."
                : "Rules accepted. Thank you for practicing responsibly."
              : locale === "ru"
                ? "Перед первой лабораторией прочитай и прими правила."
                : "Read and accept the rules before your first lab."}
          </p>
          {!user.ethicsAcceptedAt && (
            <Link href="/ethics" className="subtle-link">
              {locale === "ru" ? "Прочитать правила" : "Read the rules"}
            </Link>
          )}
        </div>
      </section>
      <section className="profile-learning">
        <div className="learning-stats">
          <article>
            <strong>{totalXp}</strong>
            <span>XP заработано</span>
          </article>
          <article>
            <strong>
              {completed.size}/{lessons.length}
            </strong>
            <span>уроков завершено</span>
          </article>
          <article>
            <strong>
              {Math.round((completed.size / lessons.length) * 100)}%
            </strong>
            <span>оба учебных пути</span>
          </article>
        </div>
        <progress max={lessons.length} value={completed.size} />
        {completed.size === lessons.length && (
          <p className="course-award">🏅 Оба учебных пути завершены</p>
        )}
      </section>
      <section
        className="profile-courses"
        aria-label="Прогресс по направлениям"
      >
        {learningPaths.map((path) => {
          const course = getCourseLessons(path.id);
          const finished = course.filter((lesson) =>
            completed.has(lesson.id),
          ).length;
          const pending = course.find((lesson) => !completed.has(lesson.id));
          return (
            <article
              className="profile-course"
              data-course={path.id}
              key={path.id}
            >
              <span className="eyebrow">PATH {path.number}</span>
              <h2>{path.name}</h2>
              <p>
                <strong>
                  {finished}/{course.length}
                </strong>{" "}
                уроков завершено
              </p>
              <progress
                aria-label={"Прогресс: " + path.name}
                value={finished}
                max={course.length}
              />
              {finished === course.length && (
                <p className="course-award">{path.completionLabel}</p>
              )}
              <Link
                className="subtle-link"
                href={pending ? "/learn/" + pending.id : "/paths/" + path.id}
              >
                {pending ? "Продолжить этот путь →" : "Открыть программу →"}
              </Link>
            </article>
          );
        })}
      </section>
      {progress.some(
        (item) => item.completedAt && !lessonIds.has(item.lessonId),
      ) && (
        <p className="program-note">
          XP за прежние уроки сохранены в общем счёте. Каждый текущий курс
          учитывается отдельно: старые ответы не заменяют новые задания.
        </p>
      )}
      <div className="empty-state">
        <Compass size={32} />
        <h2>
          {locale === "ru"
            ? next
              ? "Продолжим практику?"
              : "Оба пути завершены"
            : next
              ? "Continue your practice"
              : "Both paths completed"}
        </h2>
        <p>
          {locale === "ru"
            ? next
              ? `Следующий урок: ${next.title}`
              : "Все уроки курса засчитаны. Можно повторить практику; XP повторно не начисляется."
            : next
              ? `Next lesson: ${next.title}`
              : "All course lessons completed. Repeating a lesson does not award XP twice."}
        </p>
        <Button asChild>
          <Link href={next ? `/learn/${next.id}` : "/paths/from-zero"}>
            {locale === "ru"
              ? next
                ? "Открыть урок"
                : "Посмотреть результаты"
              : "Open learning path"}
          </Link>
        </Button>
      </div>
    </div>
  );
}
