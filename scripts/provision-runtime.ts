import { config } from "dotenv";
import { randomBytes } from "node:crypto";
import { appendFile, readFile } from "node:fs/promises";
import { Client } from "pg";
config({ path: ".env.local", quiet: true });
if (!process.env.DIRECT_URL)
  throw new Error("Задайте DIRECT_URL в .env.local перед настройкой роли.");
const destination = new URL("../.env.local", import.meta.url);
const localText = await readFile(destination, "utf8").catch(() => "");
if (/^DATABASE_URL=.+/m.test(localText) || process.env.DATABASE_URL)
  throw new Error(
    "DATABASE_URL уже задан. Скрипт не меняет существующий пароль роли; используйте ручную ротацию.",
  );
const client = new Client({ connectionString: process.env.DIRECT_URL });
try {
  await client.connect();
  const { rows } = await client.query(
    "SELECT rolsuper,rolbypassrls,rolcreaterole,rolcreatedb FROM pg_roles WHERE rolname='kairon_runtime'",
  );
  if (rows.length !== 1 || Object.values(rows[0]).some(Boolean))
    throw new Error("Сначала примените миграции и проверьте привилегии роли.");
  const memberships = await client.query(
    "SELECT 1 FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname='kairon_runtime') LIMIT 1",
  );
  if (memberships.rowCount)
    throw new Error("Runtime не должен быть членом других ролей.");
  const password = randomBytes(48).toString("base64url");
  // Значение создано локально из безопасного base64url-алфавита; не принимается из пользовательского ввода.
  await client.query(`ALTER ROLE kairon_runtime PASSWORD '${password}'`);
  const runtimeUrl = new URL(process.env.DIRECT_URL);
  runtimeUrl.username = "kairon_runtime";
  runtimeUrl.password = password;
  await appendFile(
    destination,
    `\n# Сгенерировано db:provision; для Neon замените host на pooled endpoint при необходимости.\nDATABASE_URL=${runtimeUrl.toString()}\n`,
    { mode: 0o600 },
  );
  console.log(
    "Runtime-роль настроена, DATABASE_URL записан в .env.local. Значение не выводится.",
  );
} finally {
  await client.end();
}
