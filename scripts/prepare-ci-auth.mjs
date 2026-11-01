import { Client } from "pg";
const url = new URL(process.env.DIRECT_URL || "http://invalid");
if (
  !process.env.CI ||
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  url.pathname !== "/kairon"
)
  throw new Error("This setup is only for disposable localhost CI PostgreSQL.");
const client = new Client({ connectionString: process.env.DIRECT_URL });
await client.connect();
try {
  await client.query("ALTER ROLE kairon_runtime PASSWORD 'kairon-ci-only'");
} finally {
  await client.end();
}
