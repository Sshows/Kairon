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

export function requestAddress(request: Request): string {
  // Vercel replaces this header at its edge. Outside Vercel, don't trust
  // arbitrary X-Forwarded-For headers; use a shared development bucket.
  return process.env.VERCEL
    ? request.headers
        .get("x-vercel-forwarded-for")
        ?.split(",")[0]
        ?.trim()
        .slice(0, 100) || "unknown"
    : "local";
}

export async function consumeLimit(
  scope: string,
  identity: string,
  limit: number,
  seconds: number,
) {
  if (!process.env.AUTH_SECRET) return false;
  await verifyRuntimePrivileges();
  const key = createHmac("sha256", process.env.AUTH_SECRET)
    .update(`${scope}:${identity}`)
    .digest("hex");
  const rows = await getDatabase().$queryRaw<{ allowed: boolean }[]>`
    SELECT public.kairon_consume_limit(${key}, ${limit}::integer, ${seconds}::integer) AS allowed
  `;
  return rows[0]?.allowed === true;
}
