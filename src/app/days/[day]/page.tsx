import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock3, CheckCircle2 } from "lucide-react";
import {
  getLearningDay,
  learningDays,
  learningStages,
  totalDays,
} from "@/lib/day-plan";
import { getLesson } from "@/lib/lessons";
import { DayLessonList } from "@/components/day-progress";

type Props = { params: Promise<{ day: string }> };
export function generateStaticParams() {
  return learningDays.map((day) => ({ day: String(day.day) }));
}
function parseDay(value: string) {
  return /^[1-9]\d*$/.test(value) ? getLearningDay(Number(value)) : undefined;
}
export async function generateMetadata({ params }: Props) {
  const day = parseDay((await params).day);
  return { title: day ? `День ${day.day}. ${day.title}` : "День не найден" };
}
export default async function LearningDayPage({ params }: Props) {
  const day = parseDay((await params).day);
  if (!day) notFound();
  const stage = learningStages.find((item) => item.id === day.stageId)!;
  const lessons = day.lessonIds.map((id) => {
    const lesson = getLesson(id)!;
    return {
      id: lesson.id,
      title: lesson.title,
      minutes: lesson.minutes,
      summary: lesson.summary,
    };
  });
  return (
    <div className="page-container document-page daily-page">
      <Link href="/study-plan" className="back-link">
        <ArrowLeft size={16} />
        План по дням
      </Link>
      <span className="eyebrow">
        ДЕНЬ {day.day} ИЗ {totalDays} · {stage.title}
      </span>
      <h1>
        День {day.day}. {day.title}
      </h1>
      <p className="lead">{day.summary}</p>
      <p className="day-time">
        <Clock3 size={17} />
        Примерно {day.minutes} мин. Можно разделить занятие и вернуться позже.
      </p>
      <section className="day-goal">
        <CheckCircle2 size={23} />
        <div>
          <h2>Сегодня ты научишься</h2>
          <p>{day.goal}</p>
        </div>
      </section>
      <section className="day-preparation">
        <h2>Перед началом</h2>
        <ul>
          {day.prepare.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      {day.resources.length > 0 && (
        <section className="first-day-downloads">
          <h2>
            {day.day === 1
              ? "Официальные загрузки для первого дня"
              : "Файлы и материалы этого дня"}
          </h2>
          {day.day === 1 && (
            <p>
              Для обычного компьютера с Windows выбираем VirtualBox и готовую
              машину Kali для VirtualBox. В первом уроке подробно показано, что
              скачать, распаковать и открыть. Цвет значка может отличаться —
              ориентируйся на имя файла и расширение.
            </p>
          )}
          <ol>
            {[...day.resources]
              .sort((a, b) =>
                day.day === 1
                  ? Number(b.url.includes("virtualbox.org")) -
                    Number(a.url.includes("virtualbox.org"))
                  : 0,
              )
              .map((resource) => (
                <li key={resource.url}>
                  <a
                    href={resource.url}
                    target={
                      resource.url.startsWith("https:") ? "_blank" : undefined
                    }
                    rel="noreferrer"
                    download={
                      resource.url.startsWith("/downloads/") || undefined
                    }
                  >
                    {resource.label}
                    {resource.url.startsWith("https:") ? " ↗" : " ↓"}
                  </a>
                  <p>{resource.note}</p>
                </li>
              ))}
          </ol>
          {day.day === 1 && (
            <p>
              Сначала открой урок ниже: он поможет проверить подходящий вариант
              для своего компьютера и пройти запуск по шагам. Архив готовой Kali
              распаковывают, затем добавляют файл .vbox. 7-Zip понадобится для
              архива .7z, если твой архиватор его не открывает.
            </p>
          )}
        </section>
      )}
      {day.notes.length > 0 && (
        <aside className="day-notes">
          <h2>Учти перед занятием</h2>
          <ul>
            {day.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </aside>
      )}
      <DayLessonList day={day} lessons={lessons} finalDay={totalDays} />
      <section className="day-outcome">
        <h2>Результат дня</h2>
        <p>{day.outcome}</p>
        <p>
          Если результат пока не получился, повтори нужный шаг. Переход к
          следующему дню не ограничен датой или отметкой.
        </p>
      </section>
      <nav className="day-navigation" aria-label="Соседние дни">
        {day.day > 1 ? (
          <Link href={`/days/${day.day - 1}`}>
            <ArrowLeft size={16} />
            День {day.day - 1}
          </Link>
        ) : (
          <Link href="/study-plan">Весь план</Link>
        )}
        {day.day < totalDays ? (
          <Link href={`/days/${day.day + 1}`}>
            Следующий день: {day.day + 1}
            <ArrowRight size={16} />
          </Link>
        ) : (
          <Link href="/materials">
            Что изучать дальше
            <ArrowRight size={16} />
          </Link>
        )}
      </nav>
    </div>
  );
}
