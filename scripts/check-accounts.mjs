import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { config } from "dotenv";
import { hash } from "bcryptjs";
import { Client, Pool } from "pg";
config({ path: ".env.local", quiet: true });
if (
  process.env.KAIRON_TEST_MAIL !== "1" ||
  process.env.VERCEL ||
  process.env.AUTH_URL !== "http://localhost:3000"
)
  throw new Error("Account checks require the isolated test configuration.");
const owner = new Client({ connectionString: process.env.DIRECT_URL });
const runtime = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 6,
});
const suffix = randomUUID();
const emails = [0, 1, 2].map(
  (n) => `account-check-${suffix}-${n}@example.test`,
);
const ids = [];
const keys = [];
const digest = randomBytes(32).toString("hex");
const wrong = randomBytes(32).toString("hex");
const passwordHash = await hash(randomBytes(24).toString("base64url"), 12);
async function issue(email, kind = "register") {
  const id = randomUUID();
  const result = await runtime.query(
    "SELECT public.kairon_issue_challenge($1,$2,$3,$4,$5,$6) AS ok",
    [
      id,
      email,
      kind,
      digest,
      kind === "register" ? "Test learner" : null,
      kind === "register" ? passwordHash : null,
    ],
  );
  return { id, ok: result.rows[0].ok };
}
async function finish(id, value = digest, replacement = null) {
  return (
    await runtime.query(
      "SELECT public.kairon_finish_challenge($1,$2,$3) AS ok",
      [id, value, replacement],
    )
  ).rows[0].ok;
}
async function asUser(id, query, args = []) {
  const connection = await runtime.connect();
  try {
    await connection.query("BEGIN");
    await connection.query("SELECT set_config('app.user_id',$1,true)", [id]);
    const result = await connection.query(query, args);
    await connection.query("COMMIT");
    return result;
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
}
try {
  await owner.connect();
  const schema = await owner.query(
    "SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class WHERE relname IN ('User','EmailChallenge','LessonProgress','StudyDayProgress','StudyBookmark') AND relnamespace='public'::regnamespace",
  );
  assert.equal(schema.rowCount, 5);
  for (const row of schema.rows) {
    assert.equal(row.relrowsecurity, true);
    assert.equal(row.relforcerowsecurity, true);
  }
  const first = await issue(emails[0]);
  assert.equal(first.ok, true);
  assert.equal(
    (
      await owner.query('SELECT id FROM public."User" WHERE email=$1', [
        emails[0],
      ])
    ).rowCount,
    0,
  );
  for (let index = 0; index < 5; index++)
    assert.equal(await finish(first.id, wrong), false);
  assert.equal(
    await finish(first.id),
    false,
    "five attempts lock even the correct code",
  );
  const second = await issue(emails[0]);
  assert.equal(second.ok, true);
  assert.equal(
    await finish(first.id),
    false,
    "reissue invalidates the old challenge",
  );
  await owner.query(
    'UPDATE public."EmailChallenge" SET "expiresAt"=now()-interval \'1 second\' WHERE id=$1',
    [second.id],
  );
  assert.equal(await finish(second.id), false, "expired challenge rejected");
  const third = await issue(emails[0]);
  assert.equal(
    await finish(third.id, digest, passwordHash),
    false,
    "registration cannot be consumed as recovery",
  );
  assert.equal(await finish(third.id), true);
  assert.equal(await finish(third.id), false, "code is single use");
  assert.equal(
    (await issue(emails[0])).ok,
    false,
    "registration never overwrites an account",
  );
  const fourth = await issue(emails[1]);
  assert.equal(await finish(fourth.id), true);
  for (const email of emails.slice(0, 2)) {
    const row = (
      await owner.query(
        'SELECT id,role,"emailVerifiedAt","passwordHash","sessionVersion" FROM public."User" WHERE email=$1',
        [email],
      )
    ).rows[0];
    ids.push(row.id);
    assert.equal(row.role, "USER");
    assert.ok(row.emailVerifiedAt);
    assert.equal(row.passwordHash, passwordHash);
  }
  assert.equal(
    (await issue(emails[2], "reset")).ok,
    false,
    "unknown account cannot be recovered",
  );
  const recovery = await issue(emails[0], "reset");
  assert.equal(
    await finish(recovery.id),
    false,
    "verification cannot consume a reset challenge",
  );
  const replacement = await hash(randomBytes(24).toString("base64url"), 12);
  assert.equal(await finish(recovery.id, digest, replacement), true);
  const changed = (
    await owner.query(
      'SELECT "sessionVersion","passwordHash" FROM public."User" WHERE id=$1',
      [ids[0]],
    )
  ).rows[0];
  assert.equal(changed.sessionVersion, 2);
  assert.equal(changed.passwordHash, replacement);
  // An old, unverified account must keep its ID/history and prove mailbox ownership.
  const oldId = randomUUID();
  ids.push(oldId);
  await owner.query(
    'INSERT INTO public."User" (id,email,name,"passwordHash") VALUES ($1,$2,$3,$4)',
    [oldId, emails[2], "Existing learner", passwordHash],
  );
  assert.equal(
    (
      await runtime.query("SELECT * FROM public.kairon_lookup_login($1)", [
        emails[2],
      ])
    ).rowCount,
    0,
  );
  assert.equal(
    await finish((await issue(emails[2], "reset")).id, digest, replacement),
    true,
  );
  assert.equal(
    (
      await runtime.query("SELECT id FROM public.kairon_lookup_login($1)", [
        emails[2],
      ])
    ).rows[0].id,
    oldId,
  );
  await asUser(
    ids[0],
    'INSERT INTO public."StudyDayProgress" ("userId",day) VALUES ($1,20)',
    [ids[0]],
  );
  await asUser(
    ids[1],
    'INSERT INTO public."StudyDayProgress" ("userId",day) VALUES ($1,46)',
    [ids[1]],
  );
  await asUser(
    ids[0],
    'INSERT INTO public."StudyBookmark" ("userId",day,note) VALUES ($1,20,$2)',
    [ids[0], "Only learner A"],
  );
  await asUser(
    ids[0],
    'INSERT INTO public."LessonProgress" (id,"userId","lessonId","completedAt") VALUES ($1,$2,$3,now())',
    [randomUUID(), ids[0], "kali-install"],
  );
  for (const table of ["StudyDayProgress", "StudyBookmark", "LessonProgress"]) {
    assert.equal(
      (await runtime.query(`SELECT * FROM public."${table}"`)).rowCount,
      0,
      "pool context cleared",
    );
    assert.equal(
      (
        await asUser(
          ids[1],
          `SELECT * FROM public."${table}" WHERE "userId"=$1`,
          [ids[0]],
        )
      ).rowCount,
      0,
    );
  }
  assert.equal(
    (await asUser(ids[0], 'SELECT day FROM public."StudyDayProgress"')).rows[0]
      .day,
    20,
  );
  assert.equal(
    (await asUser(ids[1], 'SELECT day FROM public."StudyDayProgress"')).rows[0]
      .day,
    46,
  );
  assert.equal(
    (
      await asUser(
        ids[1],
        'UPDATE public."StudyBookmark" SET note=$1 WHERE "userId"=$2',
        ["forged", ids[0]],
      )
    ).rowCount,
    0,
  );
  assert.equal(
    (
      await asUser(
        ids[1],
        'DELETE FROM public."StudyDayProgress" WHERE "userId"=$1',
        [ids[0]],
      )
    ).rowCount,
    0,
  );
  await assert.rejects(
    asUser(
      ids[1],
      'INSERT INTO public."StudyBookmark" ("userId",day) VALUES ($1,1)',
      [ids[0]],
    ),
  );
  await assert.rejects(
    asUser(ids[1], "UPDATE public.\"User\" SET role='ADMIN' WHERE id=$1", [
      ids[1],
    ]),
  );
  await assert.rejects(runtime.query('SELECT * FROM public."EmailChallenge"'));
  const key = randomBytes(32).toString("hex");
  keys.push(key);
  const concurrent = await Promise.all(
    Array.from({ length: 12 }, () =>
      runtime.query("SELECT public.kairon_consume_limit($1,8,900) AS ok", [
        key,
      ]),
    ),
  );
  assert.equal(concurrent.filter((result) => result.rows[0].ok).length, 8);
  const leaked = await owner.query(
    "SELECT 1 FROM pg_proc p, LATERAL aclexplode(coalesce(proacl,acldefault('f',proowner))) a WHERE pronamespace='public'::regnamespace AND proname LIKE 'kairon_%' AND a.grantee=0 AND a.privilege_type='EXECUTE'",
  );
  assert.equal(leaked.rowCount, 0);
  console.log(
    "PASS: verification, expiry, five-attempt lockout, single use, recovery/session revocation, legacy preservation, actual cross-user RLS reads/writes, pooled context, privilege boundaries, concurrent limits.",
  );
} finally {
  await owner.query(
    'DELETE FROM public."EmailChallenge" WHERE email=ANY($1::text[])',
    [emails],
  );
  await owner.query('DELETE FROM public."User" WHERE email=ANY($1::text[])', [
    emails,
  ]);
  await owner.query(
    'DELETE FROM public."LoginAttempt" WHERE key=ANY($1::text[])',
    [keys],
  );
  await runtime.end();
  await owner.end();
}
