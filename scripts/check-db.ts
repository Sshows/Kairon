import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { Client } from "pg";
import { config } from "dotenv";
import { hashPassword } from "../src/lib/password";
config({ path: ".env.local", quiet: true });
if (!process.env.DIRECT_URL || !process.env.DATABASE_URL)
  throw new Error(
    "DIRECT_URL and DATABASE_URL required; no checks were skipped.",
  );
const owner = new Client({ connectionString: process.env.DIRECT_URL });
const runtime = new Client({ connectionString: process.env.DATABASE_URL });
const ids = [randomUUID(), randomUUID()];
async function asUser(id: string, query: string, args: unknown[] = []) {
  await runtime.query("BEGIN");
  try {
    await runtime.query("SELECT set_config('app.user_id',$1,true)", [id]);
    const result = await runtime.query(query, args);
    await runtime.query("COMMIT");
    return result;
  } catch (error) {
    await runtime.query("ROLLBACK");
    throw error;
  }
}
try {
  await owner.connect();
  await runtime.connect();
  const role = (
    await runtime.query(
      "SELECT current_user,rolsuper,rolbypassrls,rolcreaterole,rolcreatedb FROM pg_roles WHERE rolname=current_user",
    )
  ).rows[0];
  assert.equal(role.current_user, "kairon_runtime");
  for (const field of [
    "rolsuper",
    "rolbypassrls",
    "rolcreaterole",
    "rolcreatedb",
  ])
    assert.equal(role[field], false);
  assert.equal(
    (
      await runtime.query(
        "SELECT 1 FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname=current_user)",
      )
    ).rowCount,
    0,
  );
  const policies = (
    await owner.query(
      "SELECT relname,relrowsecurity,relforcerowsecurity,pg_get_userbyid(relowner) AS owner FROM pg_class WHERE oid IN ('public.\"User\"'::regclass,'public.\"AuditLog\"'::regclass,'public.\"LoginAttempt\"'::regclass)",
    )
  ).rows;
  assert.equal(policies.length, 3);
  for (const row of policies) {
    assert.equal(row.relrowsecurity, true);
    assert.equal(row.relforcerowsecurity, true);
    assert.notEqual(row.owner, "kairon_runtime");
  }
  const passwordHash = await hashPassword(
    randomBytes(20).toString("base64url"),
  );
  for (const id of ids)
    await owner.query(
      'INSERT INTO "User" (id,email,name,"passwordHash") VALUES ($1,$2,$3,$4)',
      [id, `${id}@example.test`, "RLS test", passwordHash],
    );
  assert.equal((await runtime.query('SELECT id FROM "User"')).rowCount, 0);
  assert.deepEqual((await asUser(ids[0], 'SELECT id FROM "User"')).rows, [
    { id: ids[0] },
  ]);
  assert.equal(
    (await asUser(ids[0], 'SELECT id FROM "User" WHERE id=$1', [ids[1]]))
      .rowCount,
    0,
  );
  assert.equal(
    (
      await asUser(
        ids[0],
        'UPDATE "User" SET "ethicsAcceptedAt"=now() WHERE id=$1',
        [ids[1]],
      )
    ).rowCount,
    0,
  );
  assert.equal(
    (
      await asUser(
        ids[0],
        'UPDATE "User" SET "ethicsAcceptedAt"=now() WHERE id=$1',
        [ids[0]],
      )
    ).rowCount,
    1,
  );
  await assert.rejects(
    asUser(ids[0], "UPDATE \"User\" SET role='ADMIN' WHERE id=$1", [ids[0]]),
  );
  await assert.rejects(
    asUser(
      ids[0],
      'INSERT INTO "AuditLog" (id,"userId",action) VALUES ($1,$2,$3)',
      [randomUUID(), ids[1], "TEST"],
    ),
  );
  await asUser(
    ids[0],
    'INSERT INTO "AuditLog" (id,"userId",action) VALUES ($1,$2,$3)',
    [randomUUID(), ids[0], "TEST"],
  );
  assert.equal((await asUser(ids[1], 'SELECT * FROM "AuditLog"')).rowCount, 0);
  assert.equal((await runtime.query('SELECT id FROM "User"')).rowCount, 0);
  await assert.rejects(runtime.query("SET ROLE kairon_auth"));
  await assert.rejects(runtime.query('SELECT * FROM "LoginAttempt"'));
  const key = randomBytes(32).toString("hex");
  for (let i = 0; i < 9; i++)
    assert.equal(
      (
        await runtime.query(
          "SELECT kairon_consume_login_attempt($1) AS allowed",
          [key],
        )
      ).rows[0].allowed,
      i < 8,
    );
  const leaked = await owner.query(
    "SELECT 1 FROM pg_proc, LATERAL aclexplode(coalesce(proacl,acldefault('f',proowner))) a WHERE oid='public.kairon_lookup_login(text)'::regprocedure AND a.grantee=0 AND a.privilege_type='EXECUTE'",
  );
  assert.equal(leaked.rowCount, 0);
  await owner.query('DELETE FROM "LoginAttempt" WHERE key=$1', [key]);
  console.log(
    "PASS: FORCE RLS, own/cross-user read/write, context reset, no role escalation, login limit and function ACL.",
  );
} finally {
  await owner
    .query('DELETE FROM "User" WHERE id=ANY($1::text[])', [ids])
    .catch(() => {});
  await runtime.end();
  await owner.end();
}
