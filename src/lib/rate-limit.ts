import "server-only";
import { createHmac } from "node:crypto";
import { getDatabase, verifyRuntimePrivileges } from "@/lib/db";

export async function consumeLoginAttempt(email: string): Promise<boolean> {
  if (!process.env.AUTH_SECRET) return false;
  await verifyRuntimePrivileges();
  const key = createHmac("sha256", process.env.AUTH_SECRET)
    .update(email.trim().toLowerCase())
    .digest("hex");
  const rows = await getDatabase().$queryRaw<{ allowed: boolean }[]>`
    SELECT public.kairon_consume_login_attempt(${key}) AS allowed
  `;
  return rows[0]?.allowed === true;
}
