import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";

const globalDatabase = globalThis as unknown as { kaironDb?: PrismaClient };
let runtimeVerification: Promise<void> | undefined;

export async function verifyRuntimePrivileges() {
  runtimeVerification ??= (async () => {
    const rows = await getDatabase().$queryRaw<
      Array<{
        name: string;
        elevated: boolean;
        owns_data: boolean;
        memberships: bigint;
      }>
    >`
      SELECT current_user::text AS name,
        (rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb) AS elevated,
        EXISTS (SELECT FROM pg_class WHERE relname IN ('User','AuditLog','LoginAttempt') AND relowner = pg_roles.oid) AS owns_data,
        (SELECT count(*) FROM pg_auth_members WHERE member = pg_roles.oid) AS memberships
      FROM pg_roles WHERE rolname = current_user
    `;
    const role = rows[0];
    if (
      !role ||
      role.name !== "kairon_runtime" ||
      role.elevated ||
      role.owns_data ||
      role.memberships !== BigInt(0)
    ) {
      throw new Error("Runtime database role is not restricted");
    }
  })();
  try {
    await runtimeVerification;
  } catch (error) {
    runtimeVerification = undefined;
    throw error;
  }
}

export function getDatabase() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is not configured");
  if (!globalDatabase.kaironDb) {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5000,
    });
    globalDatabase.kaironDb = new PrismaClient({ adapter });
  }
  return globalDatabase.kaironDb;
}

/** userId приходит только из проверенной сервером сессии, никогда из формы или URL. */
export async function withUser<T>(
  userId: string,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (!userId || userId.length > 128)
    throw new Error("Invalid session identity");
  await verifyRuntimePrivileges();
  return getDatabase().$transaction(async (tx) => {
    // true = SET LOCAL: контекст исчезает при завершении транзакции, в том числе в пуле Neon.
    await tx.$queryRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    return operation(tx);
  });
}

export const safeUserFields = {
  id: true,
  email: true,
  name: true,
  role: true,
  blocked: true,
  sessionVersion: true,
  ethicsAcceptedAt: true,
} as const;

export function findSessionUser(userId: string) {
  return withUser(userId, (tx) =>
    tx.user.findUnique({ where: { id: userId }, select: safeUserFields }),
  );
}
