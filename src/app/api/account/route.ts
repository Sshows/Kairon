import type { NextRequest } from "next/server";
import { isAuthConfigured } from "@/lib/auth";
import { isMailConfigured } from "@/lib/email";
import { accountRequestSchema, handleAccountCode } from "@/lib/account-codes";
import {
  accountFailure,
  InputError,
  privateJson,
  readAccountInput,
} from "@/lib/account-http";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const input = accountRequestSchema.safeParse(
      await readAccountInput(request),
    );
    if (!input.success)
      throw new InputError(
        "Проверьте почту, код и длину пароля: от 12 символов, до 72 байт (кириллица занимает больше одного байта).",
        400,
      );
    if (!isAuthConfigured() || !isMailConfigured())
      throw new InputError(
        "Отправка кодов пока недоступна. Попробуйте позже; если аккаунт подтверждён, войдите по почте и паролю.",
        503,
      );
    return privateJson(await handleAccountCode(input.data, request));
  } catch (error) {
    return accountFailure(error);
  }
}
