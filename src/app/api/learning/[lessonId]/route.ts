import { NextRequest } from "next/server";
import { z } from "zod";
import { getLesson } from "@/lib/lessons";
import { checkLesson } from "@/lib/lesson-checks";
import { getCurrentUser } from "@/lib/access";
import {
  accountFailure,
  privateJson,
  readBoundedText,
} from "@/lib/account-http";
export const runtime = "nodejs";
const schema = z.strictObject({
  action: z.enum(["check", "hint"]),
  answer: z.string().max(150).default(""),
  hintIndex: z.number().int().min(0).max(2).default(0),
});
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const respond = privateJson;
  try {
    if (!(await getCurrentUser()))
      return respond(
        { error: "Войдите в аккаунт, чтобы выполнить самопроверку." },
        401,
      );
    // Cookie-authenticated JSON mutation: cross-origin requests are never accepted.
    const origin = request.headers.get("origin");
    if (!origin || origin !== request.nextUrl.origin)
      return respond({ error: "Недопустимый источник запроса." }, 403);
    const { lessonId } = await params;
    const lesson = getLesson(lessonId);
    if (!lesson) return respond({ error: "Урок не найден." }, 404);
    const text = await readBoundedText(request, 40000);
    let input;
    try {
      input = schema.safeParse(JSON.parse(text));
    } catch {
      return respond({ error: "Неверный формат запроса." }, 400);
    }
    if (!input.success)
      return respond({ error: "Проверь формат и длину ответа." }, 400);
    const data = input.data;
    const correct =
      data.action === "check" && checkLesson(lessonId, data.answer);
    // Self-checks remain stateless; account progress is saved separately.
    if (data.action === "hint")
      return respond({
        status: "hint",
        hint: lesson.hints[data.hintIndex],
        hintsUsed: data.hintIndex + 1,
        guest: false,
      });
    return respond({
      status: correct ? "passed" : "failed",
      guest: false,
      ...(correct ? { debrief: lesson.debrief } : {}),
    });
  } catch (error) {
    return accountFailure(error);
  }
}
