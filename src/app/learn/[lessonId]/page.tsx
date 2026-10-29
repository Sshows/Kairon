import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getLesson, publicLesson } from "@/lib/lessons";
import { getLessonDay, learningDays } from "@/lib/day-plan";
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
  const day = getLessonDay(lessonId);
  if (!day) notFound();
  const orderedLessonIds = learningDays.flatMap((entry) => entry.lessonIds);
  const index = orderedLessonIds.indexOf(lessonId);
  const next = orderedLessonIds[index + 1] ?? null;
  const followingDay = next ? getLessonDay(next) : null;
  const indexToday = day.lessonIds.indexOf(lessonId);
  return (
    <div className="learning-page">
      <header className="lesson-top">
        <Link href={`/days/${day.day}`} className="back-link">
          <ArrowLeft size={15} />
          День {day.day}: {day.title}
        </Link>
        <span>
          Урок {indexToday + 1} из {day.lessonIds.length} сегодня
        </span>
      </header>
      {day.lessonIds.length > 1 && (
        <nav className="lesson-stepper" aria-label="Уроки этого дня">
          {day.lessonIds.map((id, i) => (
            <Link
              key={id}
              href={`/learn/${id}`}
              className={id === lessonId ? "current" : ""}
              title={getLesson(id)!.title}
              aria-label={`${i + 1}. ${getLesson(id)!.title}`}
              aria-current={id === lessonId ? "step" : undefined}
            >
              {i + 1}
            </Link>
          ))}
        </nav>
      )}
      <LessonWorkspace
        key={lessonId}
        lesson={publicLesson(lesson)}
        path={path}
        previous={orderedLessonIds[index - 1] ?? null}
        next={next}
        dayNumber={day.day}
        dayTitle={day.title}
        nextDay={
          followingDay && followingDay.day !== day.day ? followingDay.day : null
        }
      />
    </div>
  );
}
