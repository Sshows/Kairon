import "server-only";
import { getLesson } from "./lessons";

// Самопроверка ответа: сайт не наблюдает за компьютером ученика.
export function checkLesson(id: string, answer: string): boolean {
  const lesson = getLesson(id);
  if (!lesson) return false;
  const normalized = answer
    .trim()
    .normalize("NFKC")
    .toLocaleLowerCase("ru")
    .replace(/\s+/g, " ");
  return lesson.answers.some(
    (value) => value.toLocaleLowerCase("ru") === normalized,
  );
}
