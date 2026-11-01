import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
// Never load .env.local here: this destructive fixture is local/CI only.
if (
  process.env.KAIRON_TEST_MAIL !== "1" ||
  process.env.VERCEL ||
  process.env.AUTH_URL !== "http://localhost:3000"
)
  throw new Error(
    "Migration checks require explicit isolated test configuration",
  );
const ownerUrl = new URL(process.env.DIRECT_URL);
const runtimeUrl = new URL(process.env.DATABASE_URL);
if (
  ![ownerUrl, runtimeUrl].every((url) =>
    ["localhost", "127.0.0.1"].includes(url.hostname),
  )
)
  throw new Error("Migration fixtures must use a local PostgreSQL server");
const database = "kairon_upgrade_" + randomUUID().replaceAll("-", "");
assert.match(database, /^kairon_upgrade_[a-f0-9]{32}$/);
const admin = new Client({ connectionString: ownerUrl.toString() });
ownerUrl.pathname = "/" + database;
runtimeUrl.pathname = "/" + database;
const owner = new Client({ connectionString: ownerUrl.toString() });
const runtime = new Client({ connectionString: runtimeUrl.toString() });
let created = false;
async function asUser(id, sql, args = []) {
  await runtime.query("BEGIN");
  try {
    await runtime.query("SELECT set_config('app.user_id',$1,true)", [id]);
    const result = await runtime.query(sql, args);
    await runtime.query("COMMIT");
    return result;
  } catch (error) {
    await runtime.query("ROLLBACK");
    throw error;
  }
}
const tables = ["User", "LessonProgress", "StudyDayProgress", "StudyBookmark"];
async function snapshot() {
  const result = [];
  for (const table of tables)
    result.push(
      (
        await owner.query(
          `SELECT to_jsonb(t) AS row FROM public."${table}" t ORDER BY to_jsonb(t)::text`,
        )
      ).rows,
    );
  return result;
}
async function policies() {
  return (
    await owner.query(
      "SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity,p.polname,pg_get_expr(p.polqual,p.polrelid) AS using_expression,pg_get_expr(p.polwithcheck,p.polrelid) AS check_expression FROM pg_class c JOIN pg_policy p ON p.polrelid=c.oid WHERE c.relnamespace='public'::regnamespace ORDER BY c.relname,p.polname",
    )
  ).rows;
}
try {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${database}"`);
  created = true;
  await owner.connect();
  const migration = "202611010001_expand_day_bounds";
  for (const name of readdirSync("prisma/migrations")
    .filter((n) => /^\d/.test(n))
    .sort()) {
    if (name >= migration) break;
    await owner.query(
      readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8"),
    );
  }
  const users = [randomUUID(), randomUUID()];
  for (const [index, id] of users.entries()) {
    await owner.query(
      'INSERT INTO public."User" (id,email,name,"passwordHash","emailVerifiedAt") VALUES ($1,$2,$3,$4,now())',
      [
        id,
        `migration-${index}@example.test`,
        "Migration fixture",
        "test-only-no-login",
      ],
    );
    await owner.query(
      'INSERT INTO public."StudyDayProgress" ("userId",day) VALUES ($1,$2)',
      [id, index === 0 ? 20 : 46],
    );
    await owner.query(
      'INSERT INTO public."StudyBookmark" ("userId",day,note) VALUES ($1,$2,$3)',
      [id, index === 0 ? 20 : 46, `Личная заметка ${index}`],
    );
    await owner.query(
      'INSERT INTO public."LessonProgress" (id,"userId","lessonId","completedAt") VALUES ($1,$2,$3,now())',
      [randomUUID(), id, "kali-install"],
    );
  }
  await assert.rejects(
    owner.query(
      'INSERT INTO public."StudyDayProgress" ("userId",day) VALUES ($1,76)',
      [users[0]],
    ),
    (error) => error.code === "23514",
  );
  const before = await snapshot();
  const security = await policies();
  await owner.query(
    readFileSync(`prisma/migrations/${migration}/migration.sql`, "utf8"),
  );
  assert.deepEqual(
    await snapshot(),
    before,
    "all existing user data must survive byte-for-byte at the JSON representation level",
  );
  assert.deepEqual(
    await policies(),
    security,
    "RLS flags and policies must not change",
  );
  await runtime.connect();
  await asUser(
    users[0],
    'INSERT INTO public."StudyDayProgress" ("userId",day) VALUES ($1,76)',
    [users[0]],
  );
  await asUser(
    users[0],
    'INSERT INTO public."LessonProgress" (id,"userId","lessonId","completedAt") VALUES ($1,$2,$3,now())',
    [randomUUID(), users[0], "source-sink"],
  );
  await asUser(
    users[0],
    'UPDATE public."StudyBookmark" SET day=76,"lessonId"=$1,note=$2 WHERE "userId"=$3',
    ["source-sink", "Продолжить разбор", users[0]],
  );
  assert.deepEqual(
    (
      await asUser(
        users[0],
        'SELECT day FROM public."StudyDayProgress" ORDER BY day',
      )
    ).rows.map((r) => r.day),
    [20, 76],
  );
  assert.deepEqual(
    (
      await asUser(
        users[1],
        'SELECT day FROM public."StudyDayProgress" ORDER BY day',
      )
    ).rows.map((r) => r.day),
    [46],
  );
  assert.equal(
    (
      await asUser(
        users[1],
        'SELECT * FROM public."StudyBookmark" WHERE "userId"=$1',
        [users[0]],
      )
    ).rowCount,
    0,
  );
  assert.equal(
    (
      await asUser(
        users[1],
        'UPDATE public."StudyBookmark" SET note=$1 WHERE "userId"=$2',
        ["forged", users[0]],
      )
    ).rowCount,
    0,
  );
  for (const day of [0, 366]) {
    await assert.rejects(
      asUser(
        users[0],
        'INSERT INTO public."StudyDayProgress" ("userId",day) VALUES ($1,$2)',
        [users[0], day],
      ),
      (error) => error.code === "23514",
    );
    await assert.rejects(
      asUser(
        users[0],
        'UPDATE public."StudyBookmark" SET day=$1 WHERE "userId"=$2',
        [day, users[0]],
      ),
      (error) => error.code === "23514",
    );
  }
  assert.equal(
    (await runtime.query('SELECT * FROM public."StudyBookmark"')).rowCount,
    0,
    "transaction context must clear",
  );
  console.log(
    "Day-bound migration PASS: old account/history/note snapshots preserved; day 76, new lesson and bookmark persist; cross-user reads/writes denied; DB bounds enforced.",
  );
} finally {
  await runtime.end().catch(() => {});
  await owner.end().catch(() => {});
  if (created) await admin.query(`DROP DATABASE "${database}"`);
  await admin.end();
}
