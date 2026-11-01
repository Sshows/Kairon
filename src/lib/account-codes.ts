import "server-only";
import { createHmac, randomInt, randomUUID } from "node:crypto";
import { z } from "zod";
import { getDatabase, verifyRuntimePrivileges } from "@/lib/db";
import { hashPassword, isValidPassword } from "@/lib/password";
import { sendAccountCode } from "@/lib/email";
import { consumeLimit, requestAddress } from "@/lib/rate-limit";
import { InputError } from "@/lib/account-http";

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().refine(isValidPassword);
export const accountRequestSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("register"),
    email,
    name: z.string().trim().min(1).max(60),
    password,
  }),
  z.strictObject({ action: z.literal("reset"), email }),
  z.strictObject({
    action: z.literal("verify"),
    challengeId: z.uuid(),
    code: z.string().regex(/^\d{6}$/),
  }),
  z.strictObject({
    action: z.literal("recover"),
    challengeId: z.uuid(),
    code: z.string().regex(/^\d{6}$/),
    password,
  }),
]);
export function codeDigest(id: string, code: string) {
  if (!process.env.AUTH_SECRET) throw new Error("Auth is not configured");
  return createHmac("sha256", process.env.AUTH_SECRET)
    .update(`email-code:${id}:${code}`)
    .digest("hex");
}
export async function handleAccountCode(
  input: z.infer<typeof accountRequestSchema>,
  request: Request,
) {
  await verifyRuntimePrivileges();
  if (input.action === "register" || input.action === "reset") {
    for (const [scope, identity, limit, seconds] of [
      ["mail-ip", requestAddress(request), 8, 3600],
      ["mail-minute", input.email, 1, 60],
      ["mail-email", input.email, 3, 900],
      ["mail-global", "gmail", 180, 86400],
    ] as const) {
      if (!(await consumeLimit(scope, identity, limit, seconds)))
        throw new InputError(
          "Слишком много запросов. Подождите перед отправкой нового кода; если лимит сохраняется — попробуйте позже.",
          429,
        );
    }
    const id = randomUUID();
    const code = randomInt(1000000).toString().padStart(6, "0");
    const digest = codeDigest(id, code);
    const passwordHash =
      input.action === "register" ? await hashPassword(input.password) : null;
    const name = input.action === "register" ? input.name : null;
    const rows = await getDatabase().$queryRaw<{ issued: boolean }[]>`
      SELECT public.kairon_issue_challenge(${id}, ${input.email}, ${input.action}, ${digest}, ${name}, ${passwordHash}) AS issued
    `;
    if (rows[0]?.issued) {
      try {
        await sendAccountCode(input.email, code, input.action);
      } catch {
        await getDatabase()
          .$queryRaw`SELECT public.kairon_cancel_challenge(${id})`;
        throw new InputError(
          "Не удалось отправить письмо. Подождите минуту и запросите новый код.",
          503,
        );
      }
    }
    return {
      challengeId: id,
      expiresIn: 600,
      message:
        input.action === "register"
          ? "Если адрес ещё не зарегистрирован, на него отправлен код. Если аккаунт уже есть — войдите или восстановите пароль."
          : "Если аккаунт с этой почтой существует, на неё отправлен код восстановления.",
    };
  }
  if (!(await consumeLimit("verify-ip", requestAddress(request), 30, 900)))
    throw new InputError(
      "Слишком много попыток. Попробуйте через 15 минут.",
      429,
    );
  const digest = codeDigest(input.challengeId, input.code);
  const replacement =
    input.action === "recover" ? await hashPassword(input.password) : null;
  const rows = await getDatabase().$queryRaw<{ completed: boolean }[]>`
    SELECT public.kairon_finish_challenge(${input.challengeId}, ${digest}, ${replacement}) AS completed
  `;
  if (!rows[0]?.completed)
    throw new InputError(
      "Код неверный, уже использован или устарел. После пяти ошибок запросите новый код.",
      400,
    );
  return {
    complete: true,
    message:
      input.action === "recover"
        ? "Пароль обновлён. Войдите с новым паролем."
        : "Почта подтверждена. Теперь войдите в аккаунт.",
  };
}
