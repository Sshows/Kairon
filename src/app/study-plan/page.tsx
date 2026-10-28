import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import plan from "../../../content/study-plan.json";
import jassics from "../../../content/source-audits/jassics-plan.json";
import hamed from "../../../content/source-audits/hamed-roadmap.json";
import { getLesson } from "@/lib/lessons";
import { StudyDirections } from "@/components/study-directions";
import { Button } from "@/components/ui/button";

export const metadata = { title: "С чего начать изучение безопасности" };
export default function StudyPlanPage() {
  return (
    <div className="page-container document-page study-plan-page">
      <span className="eyebrow">МАРШРУТ ОБУЧЕНИЯ</span>
      <h1>{plan.title}</h1>
      <p className="lead">{plan.introduction}</p>
      <div className="course-actions">
        <Button asChild>
          <Link href="/learn/basics-cia">
            Начать с первого понятия <ArrowRight size={17} />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <a href="#directions">Выбрать направление</a>
        </Button>
      </div>
      <p className="program-note">
        Маршрут — порядок тем, а не жёсткий календарь. Если уже понимаешь тему и
        умеешь показать результат, переходи дальше. Читать можно любой урок; для
        XP уроки выбранного пути проходят последовательно. Чтение самой карты не
        начисляет XP.
      </p>
      <nav className="study-stage-nav" aria-label="Этапы обучения">
        {plan.stages.map((stage, index) => (
          <a key={stage.id} href={`#stage-${stage.id}`}>
            {index + 1}. {stage.title}
          </a>
        ))}
      </nav>
      <div className="study-stages">
        {plan.stages.map((stage, index) => (
          <section
            className="study-stage"
            id={`stage-${stage.id}`}
            key={stage.id}
          >
            <span className="eyebrow">
              ШАГ {index + 1} ИЗ {plan.stages.length}
            </span>
            <h2>{stage.title}</h2>
            <p>{stage.summary}</p>
            <div className="study-example">
              <h3>Пример</h3>
              <p>{stage.example}</p>
            </div>
            <h3>Попробуй сам</h3>
            <p>{stage.practice}</p>
            <h3>Когда можно двигаться дальше</h3>
            <p>{stage.readyWhen}</p>
            <div className="study-lesson-links">
              {stage.lessons.map((id) => (
                <Link key={id} href={`/learn/${id}`}>
                  {getLesson(id)!.title}
                  <ArrowRight size={15} />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
      <section id="directions">
        <span className="eyebrow">ПОСЛЕ ОБЩЕЙ БАЗЫ</span>
        <h2>Выбери направление, которое тебе интересно</h2>
        <p>
          Ниже {jassics.sections.length} тематических планов: от общих навыков
          до защиты приложений, облака и работы с рисками. У каждой темы есть
          рабочий пример, своё задание и подходящие начальные уроки. Углублённые
          материалы авторов преимущественно на английском.
        </p>
        <StudyDirections
          directions={jassics.sections.map(
            ({ id, title, summary, topics }) => ({
              id,
              title,
              summary,
              topics,
            }),
          )}
        />
      </section>
      <section className="study-source-summary">
        <BookOpen size={23} />
        <div>
          <h2>Какие планы разобрали</h2>
          <p>
            jassics помогает выбрать навыки под задачу, Hamed233 показывает
            общий порядок и области развития. Мы связали их с уроками Kairon и
            подготовили свои объяснения. Обзор Hamed233 включает{" "}
            {hamed.sections.length} разделов; полный указатель есть на странице
            источников.
          </p>
          <Link className="subtle-link" href="/sources/study-plans">
            Посмотреть источники, охват и ограничения →
          </Link>
        </div>
      </section>
    </div>
  );
}
