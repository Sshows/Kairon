import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, LockKeyhole } from "lucide-react";
import { getCurrentUser } from "@/lib/access";
import { getProgress, isUnlocked } from "@/lib/learning";
import { getLesson, lessons, publicLesson } from "@/lib/lessons";
import { LessonWorkspace } from "@/components/lesson-workspace";
export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const lesson = getLesson(lessonId);
  if (!lesson) notFound();
  const user = await getCurrentUser();
  const progress = user ? await getProgress(user.id) : [];
  const completed = new Set(
    progress.filter((p) => p.completedAt).map((p) => p.lessonId),
  );
  const current = progress.find((p) => p.lessonId === lessonId);
  const index = lessons.findIndex((l) => l.id === lessonId);
  return (
    <div className="learning-page">
      <header className="lesson-top">
        <Link href="/paths/from-zero" className="back-link">
          <ArrowLeft size={15} />
          Старт с нуля
        </Link>
        <span>
          Урок {index + 1} из {lessons.length} · материалы на русском
        </span>
      </header>
      <nav className="lesson-stepper" aria-label="Уроки пути">
        {lessons.map((item, i) => (
          <Link
            key={item.id}
            href={`/learn/${item.id}`}
            className={
              item.id === lessonId
                ? "current"
                : completed.has(item.id)
                  ? "done"
                  : ""
            }
            title={item.title}
            aria-label={`${i + 1}. ${item.title}`}
            aria-current={item.id === lessonId ? "step" : undefined}
          >
            {completed.has(item.id) ? (
              <Check size={14} />
            ) : user && !isUnlocked(item.id, completed) ? (
              <LockKeyhole size={12} />
            ) : (
              i + 1
            )}
          </Link>
        ))}
      </nav>
      <LessonWorkspace
        key={lessonId}
        lesson={publicLesson(lesson)}
        next={lessons[index + 1]?.id ?? null}
        loggedIn={Boolean(user)}
        accepted={Boolean(user?.ethicsAcceptedAt)}
        unlocked={isUnlocked(lessonId, completed)}
        completed={completed.has(lessonId)}
        xp={current?.awardedXp ?? 0}
        initialDebrief={completed.has(lessonId) ? lesson.debrief : undefined}
      />
    </div>
  );
}
