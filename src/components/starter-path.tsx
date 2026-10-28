import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  LockKeyhole,
  Monitor,
} from "lucide-react";
import { getCurrentUser } from "@/lib/access";
import { getProgress, isUnlocked } from "@/lib/learning";
import { getCourseLessons, getCourseModules } from "@/lib/lessons";
import { getLearningPath, type LearningPathId } from "@/lib/learning-paths";
import { Button } from "./ui/button";

export async function StarterPath({
  pathId = "from-zero",
}: {
  pathId?: LearningPathId;
}) {
  const path = getLearningPath(pathId)!;
  const lessons = getCourseLessons(pathId);
  const courseModules = getCourseModules(pathId);
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  const user = await getCurrentUser();
  const progress = user ? await getProgress(user.id) : [];
  const completed = new Set(
    progress
      .filter((item) => item.completedAt && lessonIds.has(item.lessonId))
      .map((item) => item.lessonId),
  );
  const next =
    lessons.find((lesson) => !completed.has(lesson.id)) ?? lessons[0];
  return (
    <div className="page-container document-page starter-path">
      <Link href="/#paths" className="back-link">
        <ArrowLeft size={16} />
        Все направления
      </Link>
      <span className="eyebrow">
        PATH {path.number} · {path.name}
      </span>
      <h1>{path.title}</h1>
      <p className="lead">{path.description}</p>
      <div className="course-summary">
        <span>
          <Monitor size={18} />
          Практика в своей Kali
        </span>
        <span>
          <BookOpen size={18} />
          {lessons.length} уроков · {courseModules.length} уровня
        </span>
        <span>До {lessons.reduce((sum, lesson) => sum + lesson.xp, 0)} XP</span>
      </div>
      <div className="course-actions">
        <Button asChild>
          <Link href={`/learn/${next.id}`}>
            {completed.size ? "Продолжить обучение" : path.startLabel}
            <ArrowRight size={17} />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/resources">Книги и проекты</Link>
        </Button>
      </div>
      {user && (
        <div className="course-progress">
          <span>
            Пройдено {completed.size} из {lessons.length}
          </span>
          <progress
            aria-label={"Прогресс: " + path.name}
            value={completed.size}
            max={lessons.length}
          />
        </div>
      )}
      <p className="program-note">
        Уроки, файлы и самопроверка открыты без регистрации. Для сохранения XP
        нужен аккаунт и принятие правил. Время — примерный ориентир: можно идти
        медленнее и повторять шаги.
      </p>
      {pathId === "kali-practice" && (
        <section className="notice source-course-note">
          <BookOpen size={20} />
          <div>
            <p>
              Темы подсказаны указателем LabEx. Здесь собственный стенд и уроки
              Kairon: объясняем механизм инструмента, каждую важную опцию и
              пределы вывода.
            </p>
            <Link href="/toolbox" className="subtle-link">
              Как устроены инструменты и когда их выбирать →
            </Link>
            <Link href="/sources/labex-kali" className="subtle-link">
              Все 36 тем исходного указателя →
            </Link>
          </div>
        </section>
      )}
      {pathId === "diagnostics" && (
        <section className="notice source-course-note">
          <BookOpen size={20} />
          <div>
            <p>
              Темы выбраны после разбора Awesome-Hacking и The Book of Secret
              Knowledge. Учебное дело и файлы написаны для Kairon. Сначала
              учимся понимать наблюдения, затем выбираем подходящий справочник.
            </p>
            <Link href="/collections" className="subtle-link">
              Подборки с примерами и объяснениями →
            </Link>
          </div>
        </section>
      )}
      {pathId === "file-analysis" && (
        <section className="notice source-course-note">
          <BookOpen size={20} />
          <div>
            <p>
              Темы выбраны после разбора Malware Bible и справочника
              paulveillard. Упражнения и данные Kairon написаны отдельно: учимся
              читать признаки, не объявляя каждое совпадение доказанным
              заражением.
            </p>
            <Link href="/sources/malware-bible" className="subtle-link">
              Что есть в Malware Bible →
            </Link>
            <Link href="/library" className="subtle-link">
              Как выбрать инструмент под задачу →
            </Link>
          </div>
        </section>
      )}
      {pathId === "security-basics" && (
        <section className="notice source-course-note">
          <BookOpen size={20} />
          <div>
            <p>
              Начни с этих понятий, если инструменты пока кажутся набором
              незнакомых слов. Темы выбраны после разбора двух планов обучения;
              задания и объяснения написаны для Kairon.
            </p>
            <Link href="/study-plan" className="subtle-link">
              Как связаны темы и что изучать дальше →
            </Link>
          </div>
        </section>
      )}
      {pathId === "kali-tools" && (
        <section className="notice source-course-note">
          <BookOpen size={20} />
          <div>
            <p>
              Темы взяты из Cybersecurity-Projects. Начинаем с маленьких
              примеров Kairon: ничего не нужно разворачивать на сервере, все
              действия показаны по порядку.
            </p>
            <Link href="/projects" className="subtle-link">
              Все проекты с объяснениями →
            </Link>
          </div>
        </section>
      )}
      {pathId === "blue-team" && (
        <section className="notice source-course-note">
          <BookOpen size={20} />
          <div>
            <p>
              Темы подсказаны открытыми публикациями «Карманного хакера».
              Объяснения и учебные дела написаны для Kairon; технические правила
              проверены по документации.
            </p>
            <Link href="/sources/pocket-hacker" className="subtle-link">
              Что проверили в канале →
            </Link>
            <p>
              Начать можно независимо от курса Kali. Для практики распакуй
              отдельный набор из первого урока.
            </p>
          </div>
        </section>
      )}
      <div className="course-jump-links" aria-label="Уровни курса">
        {courseModules.map((module, index) => (
          <a href={`#level-${index + 1}`} key={module}>
            0{index + 1} · {module}
          </a>
        ))}
      </div>
      {courseModules.map((module, moduleIndex) => (
        <section
          className="course-module"
          id={`level-${moduleIndex + 1}`}
          key={module}
        >
          <div className="course-module-heading">
            <span className="eyebrow">УРОВЕНЬ {moduleIndex + 1}</span>
            <h2>{module}</h2>
          </div>
          <div className="course-lessons">
            {lessons
              .filter((lesson) => lesson.module === module)
              .map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/learn/${lesson.id}`}
                  className={completed.has(lesson.id) ? "completed" : ""}
                >
                  <span className="course-lesson-number">
                    {completed.has(lesson.id) ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      String(lessons.indexOf(lesson) + 1).padStart(2, "0")
                    )}
                  </span>
                  <div>
                    <h3>{lesson.title}</h3>
                    <p>{lesson.summary}</p>
                    <span className="course-lesson-meta">
                      {lesson.minutes} мин · {lesson.xp} XP · {lesson.level}
                    </span>
                  </div>
                  {user && !isUnlocked(lesson.id, completed) ? (
                    <LockKeyhole
                      size={17}
                      aria-label="Зачёт после предыдущих уроков"
                    />
                  ) : (
                    <ArrowRight size={17} />
                  )}
                </Link>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
