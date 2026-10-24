import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Сборка клиента не требует базы. Для миграций нужен DIRECT_URL владельца.
  datasource: { url: process.env.DIRECT_URL ?? "" },
});
