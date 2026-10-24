import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/access";
import { getLesson } from "@/lib/lessons";
import { checkLesson } from "@/lib/lesson-checks";
import { updateLearning } from "@/lib/learning";
const schema = z.object({
  action: z.enum(["check", "hint"]),
  mode: z.enum(["browser", "kali"]).default("browser"),
  commands: z.array(z.string().max(300)).max(80).default([]),
  answer: z.string().max(150).default(""),
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
  const user = await getCurrentUser();
  if (!user)
    return respond(
      { error: "Войди, чтобы проверять задания и сохранять прогресс." },
      401,
    );
  if (!user.ethicsAcceptedAt)
    return respond(
      {
        error: "Сначала прими правила безопасной практики.",
        needsEthics: true,
      },
      403,
    );
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
    return respond({ error: "Проверь размер ответа и список команд." }, 400);
  const data = input.data;
  const result = await updateLearning(
    user.id,
    lessonId,
    data.action,
    data.action === "check" &&
      checkLesson(lessonId, data.commands, data.answer, data.mode),
  );
  return respond(
    {
      ...result,
      ...(result.status === "passed" ? { debrief: lesson.debrief } : {}),
    },
    result.status === "locked" ? 423 : result.status === "limited" ? 429 : 200,
  );
}
