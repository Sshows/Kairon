import { test, expect } from "@playwright/test";
import { Client } from "pg";
import { randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "../../src/lib/password";
const accounts = [
  { id: randomUUID(), role: "USER", name: "Test learner" },
  { id: randomUUID(), role: "ADMIN", name: "Test admin" },
];
const password = randomBytes(24).toString("base64url");
test.beforeAll(async () => {
  if (!process.env.DIRECT_URL || !process.env.DATABASE_URL)
    throw new Error("Real database URLs required: auth tests must not skip.");
  const db = new Client({ connectionString: process.env.DIRECT_URL });
  try {
    await db.connect();
    const hash = await hashPassword(password);
    for (const user of accounts)
      await db.query(
        'INSERT INTO "User" (id,email,name,"passwordHash",role) VALUES ($1,$2,$3,$4,$5::"Role")',
        [user.id, `${user.id}@example.test`, user.name, hash, user.role],
      );
  } finally {
    await db.end();
  }
});
test.afterAll(async () => {
  const db = new Client({ connectionString: process.env.DIRECT_URL });
  try {
    await db.connect();
    await db.query('DELETE FROM "User" WHERE id=ANY($1::text[])', [
      accounts.map((u) => u.id),
    ]);
  } finally {
    await db.end();
  }
});
test("public catalogue filters and protected routes reject anonymous visitors", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("searchbox", { name: "Найти путь или тему…" })
    .fill("RAG");
  await expect(page.locator(".path-card")).toHaveCount(1);
  await expect(page.locator(".path-card")).toContainText(
    "Безопасность ИИ и данных",
  );
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
  const response = await page.request.get("/api/me");
  expect(response.status()).toBe(401);
});
test("learner can accept ethics, cannot enter admin, and blocking revokes their session", async ({
  page,
}) => {
  const learner = accounts[0];
  await page.goto("/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${learner.id}@example.test`);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти в Kairon" }).click();
  await expect(page).toHaveURL(/\/profile/);
  await page.goto("/ethics");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Принять правила" }).click();
  await expect(page).toHaveURL(/\/profile/);
  await expect(
    page.getByText("Правила приняты.", { exact: false }),
  ).toBeVisible();
  const profile = await page.request.get("/api/me");
  const data = await profile.json();
  expect(data.id).toBe(learner.id);
  expect(data.ethicsAcceptedAt).toBeTruthy();
  expect(data.passwordHash).toBeUndefined();
  await page.goto("/admin");
  await expect(page).toHaveURL("/");
  const db = new Client({ connectionString: process.env.DIRECT_URL });
  try {
    await db.connect();
    await db.query('UPDATE "User" SET blocked=true WHERE id=$1', [learner.id]);
  } finally {
    await db.end();
  }
  expect((await page.request.get("/api/me")).status()).toBe(401);
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login/);
});
test("administrator role is accepted after credentials login", async ({
  page,
}) => {
  const admin = accounts[1];
  await page.goto("/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${admin.id}@example.test`);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти в Kairon" }).click();
  await expect(page).toHaveURL(/\/profile/);
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Панель администратора" }),
  ).toBeVisible();
});
