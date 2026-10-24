import { config } from "dotenv";
import { Client } from "pg";
import { randomUUID } from "node:crypto";
import { hashPassword } from "../src/lib/password";
config({ path: ".env.local", quiet: true });
async function main() {
  if (!process.env.DIRECT_URL) throw new Error("DIRECT_URL не задан.");
  const action = process.argv[2] ?? "create";
  const email = process.env.KAIRON_ACCOUNT_EMAIL?.trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254)
    throw new Error("Задайте KAIRON_ACCOUNT_EMAIL в окружении или .env.local.");
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  try {
    await client.connect();
    if (action === "create") {
      const name = process.env.KAIRON_ACCOUNT_NAME?.trim();
      const password = process.env.KAIRON_ACCOUNT_PASSWORD;
      const role = process.env.KAIRON_ACCOUNT_ROLE ?? "USER";
      if (
        !name ||
        name.length > 100 ||
        !password ||
        !["USER", "ADMIN"].includes(role)
      )
        throw new Error(
          "Для создания задайте KAIRON_ACCOUNT_NAME, KAIRON_ACCOUNT_PASSWORD и роль USER/ADMIN.",
        );
      const passwordHash = await hashPassword(password);
      await client.query(
        'INSERT INTO "User" (id,email,name,"passwordHash",role) VALUES ($1,$2,$3,$4,$5::"Role")',
        [randomUUID(), email, name, passwordHash, role],
      );
      console.log("Аккаунт создан. Пароль и данные пользователя не выводятся.");
    } else if (action === "block" || action === "unblock") {
      const result = await client.query(
        'UPDATE "User" SET blocked=$1,"sessionVersion"="sessionVersion"+1,"updatedAt"=now() WHERE email=$2',
        [action === "block", email],
      );
      if (result.rowCount !== 1) throw new Error("Аккаунт не найден.");
      console.log("Статус аккаунта обновлён. Предыдущие сессии отозваны.");
    } else throw new Error("Допустимые команды: create, block, unblock.");
  } finally {
    await client.end();
  }
}
main().catch(() => {
  console.error(
    "Операция не выполнена. Проверьте параметры, соединение и наличие аккаунта; данные подключения скрыты.",
  );
  process.exitCode = 1;
});
