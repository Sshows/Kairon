import { NextRequest } from "next/server";
import { z } from "zod";
import { getLesson } from "@/lib/lessons";
import { checkLesson } from "@/lib/lesson-checks";
const schema = z.strictObject({
  action: z.enum(["check", "hint"]),
  answer: z.string().max(150).default(""),
  hintIndex: z.number().int().min(0).max(2).default(0),
});
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const respond = (body: unknown, status = 200) =>
    Response.json(body, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    });
  // Cookie-authenticated JSON mutation: cross-origin requests are never accepted.
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin)
    return respond({ error: "Недопустимый источник запроса." }, 403);
  if (Number(request.headers.get("content-length") ?? 0) > 40000)
    return respond({ error: "Слишком большой запрос." }, 413);
  const { lessonId } = await params;
  const lesson = getLesson(lessonId);
  if (!lesson) return respond({ error: "Урок не найден." }, 404);
  const text = await request.text();
  if (text.length > 40000)
    return respond({ error: "Слишком большой запрос." }, 413);
  let input;
  try {
    input = schema.safeParse(JSON.parse(text));
  } catch {
    return respond({ error: "Неверный формат запроса." }, 400);
  }
  if (!input.success)
    return respond({ error: "Проверь формат и длину ответа." }, 400);
  const data = input.data;
  const correct = data.action === "check" && checkLesson(lessonId, data.answer);
  // Learning is public and stateless. Existing account cookies are ignored.
  if (data.action === "hint")
    return respond({
      status: "hint",
      hint: lesson.hints[data.hintIndex],
      hintsUsed: data.hintIndex + 1,
      guest: true,
    });
  return respond({
    status: correct ? "passed" : "failed",
    guest: true,
    ...(correct ? { debrief: lesson.debrief } : {}),
  });
}
