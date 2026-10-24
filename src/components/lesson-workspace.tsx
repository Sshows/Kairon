"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Markdown from "react-markdown";
import {
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  LoaderCircle,
  Monitor,
  Terminal,
} from "lucide-react";
import type { PublicLesson } from "@/lib/lessons";
import { TrainingTerminal } from "./training-terminal";
import { Button } from "./ui/button";
export function LessonWorkspace({
  lesson,
  next,
  loggedIn,
  accepted,
  completed,
  xp,
  initialDebrief,
  unlocked,
}: {
  lesson: PublicLesson;
  next: string | null;
  loggedIn: boolean;
  accepted: boolean;
  completed: boolean;
  xp: number;
  initialDebrief?: string;
  unlocked: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"browser" | "kali">("browser");
  const [commands, setCommands] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [hint, setHint] = useState("");
  const [passed, setPassed] = useState(completed);
  const [debrief, setDebrief] = useState(initialDebrief ?? "");
  const [earned, setEarned] = useState(xp);
  async function submit(action: "hint" | "check") {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/learning/${lesson.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, mode, commands, answer }),
      });
      const data = await response.json();
      if (data.error) {
        setMessage(data.error);
        return;
      }
      if (data.status === "passed") {
        setPassed(true);
        setEarned(data.xp);
        setDebrief(data.debrief);
        router.refresh();
      } else if (data.status === "hint") {
        setHint(`Подсказка ${data.hintsUsed}/3: ${data.hint}`);
      } else
        setMessage(
          data.status === "locked"
            ? "Сначала заверши предыдущие уроки."
            : data.status === "limited"
              ? "Достигнут лимит проверок. Подожди минуту."
              : "Пока не получилось. Проверь цель задания и результат команд.",
        );
    } catch {
      setMessage(
        "Не удалось связаться с сервером. Результат пока не сохранён. Попробуй ещё раз.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="lesson-split">
      <article className="lesson-theory">
        <span className="eyebrow">
          {lesson.module} · {lesson.minutes} мин · до {lesson.xp} XP
        </span>
        <h1>{lesson.title}</h1>
        <div className="lesson-markdown">
          <Markdown>{lesson.theory}</Markdown>
        </div>
        <Link className="subtle-link" href="/glossary" target="_blank">
          Непонятное слово? Открыть словарь ↗
        </Link>
        {passed && (
          <section className="lesson-debrief">
            <h2>
              <CheckCircle2 size={20} />
              Разбор
            </h2>
            <p>{debrief}</p>
            <strong>Засчитано · {earned} XP</strong>
            {next ? (
              <Button asChild>
                <Link href={`/learn/${next}`}>
                  Следующий урок
                  <ArrowRight size={16} />
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/profile">
                  Путь завершён — открыть профиль
                  <ArrowRight size={16} />
                </Link>
              </Button>
            )}
          </section>
        )}
      </article>
      <aside className="lesson-practice">
        <div className="practice-goal">
          <span className="eyebrow">ТВОЯ ЗАДАЧА</span>
          <p>{lesson.goal}</p>
        </div>
        <div
          className="practice-tabs"
          role="group"
          aria-label="Где выполнять практику"
        >
          <button
            onClick={() => setMode("browser")}
            aria-pressed={mode === "browser"}
          >
            <Monitor size={15} />В браузере
          </button>
          <button
            onClick={() => setMode("kali")}
            aria-pressed={mode === "kali"}
          >
            <Terminal size={15} />В своей Kali
          </button>
        </div>
        {mode === "browser" ? (
          <TrainingTerminal onCommands={setCommands} disabled={pending} />
        ) : (
          <section className="local-kali">
            <h2>Практика на твоём компьютере</h2>
            <p>
              Скачай и просмотри скрипт. Он создаёт только новую папку
              ~/kairon-lab с вымышленными файлами, без sudo и сетевых запросов.
              Если папка уже есть, скрипт остановится и сохранит её.
            </p>
            <a className="subtle-link" href="/kairon-lab-setup.sh" download>
              Скачать учебные файлы (.sh) ↓
            </a>
            <pre>
              <code>
                {
                  "# Из папки с загруженным скриптом:\nbash kairon-lab-setup.sh\ncd ~/kairon-lab"
                }
              </code>
            </pre>
            <p>
              В следующих уроках возвращайся в ~/kairon-lab. Проверка ниже
              оценивает твой ответ и не подключается к Kali. Результаты со своей
              машины не отправляются автоматически.
            </p>
            <p>
              Команды mkdir и touch можно повторять с другими учебными именами.
              Не удаляй собственные рабочие файлы ради упражнения.
            </p>
          </section>
        )}
        {lesson.kind === "choice" ? (
          <fieldset className="lesson-choices">
            <legend>Выбери ответ</legend>
            {lesson.choices?.map((choice) => (
              <label key={choice.id}>
                <input
                  type="radio"
                  name="lesson-answer"
                  value={choice.id}
                  checked={answer === choice.id}
                  onChange={() => setAnswer(choice.id)}
                />
                <span>{choice.text}</span>
              </label>
            ))}
          </fieldset>
        ) : mode === "kali" ? (
          <label className="local-answer">
            {lesson.localQuestion}
            <input
              value={answer}
              maxLength={150}
              onChange={(e) => setAnswer(e.target.value)}
              aria-label="Ответ после практики в Kali"
            />
          </label>
        ) : null}
        {!loggedIn ? (
          <div className="learning-gate">
            Практиковаться можно сразу. <Link href="/login">Войди</Link>, чтобы
            сервер проверял задания и сохранял прогресс.
          </div>
        ) : !accepted ? (
          <div className="learning-gate">
            Перед сохранением результатов{" "}
            <Link href="/ethics">прими правила практики</Link>.
          </div>
        ) : !unlocked ? (
          <div className="learning-gate">
            Для сохранения результата сначала заверши предыдущие уроки пути.
            Практика для ознакомления доступна.
          </div>
        ) : null}
        <div className="lesson-controls">
          <Button
            onClick={() => submit("check")}
            disabled={pending || passed || !loggedIn || !accepted || !unlocked}
          >
            {pending ? (
              <LoaderCircle size={16} className="spin" />
            ) : passed ? (
              <CheckCircle2 size={16} />
            ) : null}
            {passed ? "Урок засчитан" : "Проверить задание"}
          </Button>
          <Button
            variant="outline"
            onClick={() => submit("hint")}
            disabled={pending || passed || !loggedIn || !accepted || !unlocked}
          >
            <Lightbulb size={16} />
            Подсказка · −10 XP
          </Button>
        </div>
        {message && (
          <p className="learning-message" role="status">
            {message}
          </p>
        )}
        {hint && (
          <p className="learning-hint" role="status">
            {hint}
          </p>
        )}
        {passed && (
          <p className="learning-success" role="status">
            Задание выполнено. Разбор открыт слева. XP начисляется один раз.
          </p>
        )}
      </aside>
    </div>
  );
}
