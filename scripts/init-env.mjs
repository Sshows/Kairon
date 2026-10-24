import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
const template = await readFile(
  new URL("../.env.example", import.meta.url),
  "utf8",
);
try {
  await writeFile(
    new URL("../.env.local", import.meta.url),
    template.replace(
      "AUTH_SECRET=",
      `AUTH_SECRET=${randomBytes(48).toString("base64url")}`,
    ),
    { flag: "wx", mode: 0o600 },
  );
  console.log(
    "Создан .env.local. Добавьте DSN в локальном редакторе; секрет не выводится.",
  );
} catch (error) {
  if (error.code === "EEXIST")
    console.log(".env.local уже существует; файл сохранён.");
  else throw error;
}
