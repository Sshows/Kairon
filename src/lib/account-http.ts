import "server-only";
import type { NextRequest } from "next/server";

export function privateJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}

export async function readAccountInput(request: NextRequest): Promise<unknown> {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    throw new InputError("Недопустимый источник запроса.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new InputError("Нужен запрос в формате JSON.", 415);
  if (Number(request.headers.get("content-length") ?? 0) > 16000)
    throw new InputError("Слишком большой запрос.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new InputError("Пустой запрос.", 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 16000) {
      await reader.cancel();
      throw new InputError("Слишком большой запрос.", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new InputError("Не удалось прочитать запрос.", 400);
  }
}

export class InputError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function accountFailure(error: unknown) {
  if (error instanceof InputError)
    return privateJson({ error: error.message }, error.status);
  console.error("[account] request failed");
  return privateJson(
    { error: "Сервис временно недоступен. Попробуйте немного позже." },
    503,
  );
}
