import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowLeft, Check, LockKeyhole } from "lucide-react";
import { getCurrentUser } from "@/lib/access";
import { getProgress, isUnlocked } from "@/lib/learning";
import { getLesson, getCourseLessons, publicLesson } from "@/lib/lessons";
import { getLearningPath } from "@/lib/learning-paths";
import { LessonWorkspace } from "@/components/lesson-workspace";
export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const legacyLessons: Record<string, string> = {
    permission: "kali-install",
    "where-am-i": "kali-first-boot",
    "hidden-files": "lab-files",
    "move-around": "lab-files",
    "read-evidence": "suspicious-file",
    "find-in-logs": "login-investigation",
    "create-files": "lab-files",
    "write-report": "incident-report",
    "file-permissions": "file-access",
    "network-basics": "local-web",
  };
  if (Object.hasOwn(legacyLessons, lessonId))
    permanentRedirect("/learn/" + legacyLessons[lessonId]);
  const lesson = getLesson(lessonId);
  if (!lesson) notFound();
  const path = getLearningPath(lesson.pathId)!;
  const lessons = getCourseLessons(lesson.pathId);
  const lessonIds = new Set(lessons.map((item) => item.id));
  const user = await getCurrentUser();
  const progress = user ? await getProgress(user.id) : [];
  const completed = new Set(
    progress
      .filter((p) => p.completedAt && lessonIds.has(p.lessonId))
      .map((p) => p.lessonId),
  );
  const current = progress.find((p) => p.lessonId === lessonId);
  const index = lessons.findIndex((l) => l.id === lessonId);
  return (
    <div className="learning-page">
      <header className="lesson-top">
        <Link href={"/paths/" + path.id} className="back-link">
          <ArrowLeft size={15} />
          {path.name}
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
        path={path}
        previous={lessons[index - 1]?.id ?? null}
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
