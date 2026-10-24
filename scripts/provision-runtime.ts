import { config } from "dotenv";
import { randomBytes } from "node:crypto";
import { appendFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Client } from "pg";
const envFile = process.env.KAIRON_ENV_FILE ?? ".env.local";
config({ path: envFile, quiet: true });
if (!process.env.DIRECT_URL)
  throw new Error("Задайте DIRECT_URL в .env.local перед настройкой роли.");
const destination = resolve(envFile);
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
  if (runtimeUrl.hostname.endsWith(".neon.tech")) {
    const parts = runtimeUrl.hostname.split(".");
    if (!parts[0].endsWith("-pooler")) parts[0] += "-pooler";
    runtimeUrl.hostname = parts.join(".");
  }
  await appendFile(
    destination,
    `\n# Ограниченная runtime-роль; Neon использует pooled endpoint.\nDATABASE_URL=${runtimeUrl.toString()}\n`,
    { mode: 0o600 },
  );
  console.log(
    "Runtime-роль настроена, DATABASE_URL записан в выбранный env-файл. Значение не выводится.",
  );
} finally {
  await client.end();
}
