import "server-only";
import { lessons } from "./lessons";

function normalizeAnswer(value: string): string {
  return value
    .trim()
    .normalize("NFKC")
    .toLocaleLowerCase("ru")
    .replace(/\s+/g, " ");
}

const normalizedAnswersByLesson = new Map<string, ReadonlySet<string>>(
  lessons.map((lesson) => [
    lesson.id,
    new Set(lesson.answers.map((ans) => normalizeAnswer(ans))),
  ]),
);

// Самопроверка ответа: сайт не наблюдает за компьютером ученика.
export function checkLesson(id: string, answer: string): boolean {
  const accepted = normalizedAnswersByLesson.get(id);
  if (!accepted) return false;
  return accepted.has(normalizeAnswer(answer));
}
