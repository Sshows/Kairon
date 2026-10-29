import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Monitor } from "lucide-react";
import { getCourseLessons, getCourseModules } from "@/lib/lessons";
import { getLessonDay } from "@/lib/day-plan";
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
  const firstDay = getLessonDay(lessons[0].id)!;
  return (
    <div className="page-container document-page starter-path">
      <Link href="/study-plan" className="back-link">
        <ArrowLeft size={16} />
        План по дням
      </Link>
      <span className="eyebrow">ТЕМАТИЧЕСКАЯ ПОДБОРКА · {path.name}</span>
      <h1>{path.title}</h1>
      <p className="lead">{path.description}</p>
      <div className="course-summary">
        <span>
          <Monitor size={18} />
          {pathId === "web-security"
            ? "Свой компьютер и браузер"
            : "Практика в своей Kali"}
        </span>
        <span>
          <BookOpen size={18} />
          {lessons.length} уроков · {courseModules.length} уровня
        </span>
      </div>
      <div className="course-actions">
        <Button asChild>
          <Link href={`/days/${firstDay.day}`}>
            Открыть день {firstDay.day}
            <ArrowRight size={17} />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/resources">Книги и проекты</Link>
        </Button>
      </div>
      <p className="program-note">
        Все эти уроки уже распределены по дням общего плана. Здесь удобно
        вернуться к знакомой теме. Уроки и самопроверка бесплатны; отметки
        сохраняются в твоём браузере. Время — ориентир, можно заниматься
        медленнее.
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
      {pathId === "web-security" && (
        <section className="notice source-course-note">
          <BookOpen size={20} />
          <div>
            <p>
              Магазин работает на твоём компьютере. Открывай адрес из урока в
              том же Windows или Kali, где запущен магазин: localhost у Windows
              и у виртуальной машины — разные места. Kairon показывает
              объяснения; отметки о прохождении сохраняются в твоём браузере.
              Практика выполняется на своём компьютере.
            </p>
            <Link href="/web-labs" className="subtle-link">
              Juice Shop, весь указатель Hacker101 и шпаргалки OWASP →
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
              В плане по дням эта практика идёт после подготовки Kali. Для неё
              нужен отдельный набор из первого урока подборки.
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
                <Link key={lesson.id} href={`/learn/${lesson.id}`}>
                  <span className="course-lesson-number">
                    {String(lessons.indexOf(lesson) + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>{lesson.title}</h3>
                    <p>{lesson.summary}</p>
                    <span className="course-lesson-meta">
                      {lesson.minutes} мин · день {getLessonDay(lesson.id)!.day}{" "}
                      общего плана
                    </span>
                  </div>
                  <ArrowRight size={17} />
                </Link>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
