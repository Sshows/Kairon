import { ContinueLearning, DayPlanList } from "@/components/day-progress";
import {
  learningDays,
  learningStages,
  totalDays,
  totalPlannedMinutes,
} from "@/lib/day-plan";

export const metadata = { title: "План обучения по дням" };
export default function StudyPlanPage() {
  return (
    <div className="page-container document-page daily-plan-page">
      <span className="eyebrow">ОДИН ПОНЯТНЫЙ МАРШРУТ</span>
      <h1>{totalDays} учебных дней: от первого запуска до практики</h1>
      <p className="lead">
        Иди сверху вниз. В первом дне настроишь учебный компьютер, затем
        постепенно разберёшь основы, инструменты и реальные учебные задачи. Все{" "}
        {learningDays.flatMap((day) => day.lessonIds).length} уроков уже
        распределены по сложности и времени.
      </p>
      <p className="program-note">
        Около {Math.round(totalPlannedMinutes / 60)} часов по оценкам уроков,
        обычно 1–2 часа за занятие. Это 12 недель при пяти занятиях в неделю.
        Установка, повторение и собственная практика могут занять больше
        времени. Здесь нет сроков сдачи: любой день можно открыть и повторить.
      </p>
      <ContinueLearning days={learningDays} compact />
      <h2 className="day-plan-heading">Все дни по порядку</h2>
      <p className="day-plan-help">
        Открой этап, затем нужный день. Текущий этап уже раскрыт.
      </p>
      <DayPlanList days={learningDays} stages={learningStages} />
    </div>
  );
}
