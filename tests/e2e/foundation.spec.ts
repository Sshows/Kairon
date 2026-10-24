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
  const submit = (lesson: string, body: object) =>
    page.request.post(`/api/learning/${lesson}`, {
      headers: { Origin: "http://localhost:3000" },
      data: body,
    });
  expect(
    (
      await submit("where-am-i", { action: "check", commands: ["pwd"] })
    ).status(),
  ).toBe(423);
  const crossOrigin = await page.request.post("/api/learning/permission", {
    headers: { Origin: "https://example.com" },
    data: { action: "check", answer: "permission" },
  });
  expect(crossOrigin.status()).toBe(403);
  const completed = await Promise.all(
    Array.from({ length: 4 }, () =>
      submit("permission", { action: "check", answer: "permission" }),
    ),
  );
  for (const result of completed)
    expect((await result.json()).status).toBe("passed");
  const forged = await submit("where-am-i", {
    action: "check",
    commands: [],
    answer: "pwd",
  });
  expect((await forged.json()).status).toBe("failed");
  const hint = await submit("where-am-i", { action: "hint" });
  expect((await hint.json()).hintsUsed).toBe(1);
  await page.goto("/learn/where-am-i");
  await page.getByLabel("Команда терминала", { exact: true }).fill("pwd");
  await page.getByLabel("Команда терминала", { exact: true }).press("Enter");
  await page
    .getByRole("button", { name: "Проверить задание", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Урок засчитан", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Разбор", exact: true }),
  ).toBeVisible();
  const ownerDb = new Client({ connectionString: process.env.DIRECT_URL });
  try {
    await ownerDb.connect();
    const result = await ownerDb.query(
      'SELECT count(*)::int AS count,sum("awardedXp")::int AS xp FROM "LessonProgress" WHERE "userId"=$1 AND "completedAt" IS NOT NULL',
      [learner.id],
    );
    expect(result.rows[0]).toEqual({ count: 2, xp: 100 });
  } finally {
    await ownerDb.end();
  }
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
test("guest terminal works and lesson debrief stays private", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/terminal");
  const field = page.getByLabel("Команда терминала", { exact: true });
  await field.fill("cat rules.txt");
  await field.press("Enter");
  await expect(page.getByRole("log")).toContainText("Разрешение владельца");
  await field.fill("mkdir notes");
  await field.press("Enter");
  await field.fill("touch notes/demo.txt");
  await field.press("Enter");
  await field.fill("ls notes");
  await field.press("Enter");
  await expect(page.getByRole("log")).toContainText("demo.txt");
  await page.screenshot({
    path: "test-results/public-terminal-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Сбросить терминал" }).click();
  await field.fill("ls notes");
  await field.press("Enter");
  await expect(page.getByRole("log")).toContainText("путь не найден");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/learn/read-evidence");
  await expect(
    page.getByRole("heading", { name: "Разбор", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Проверить задание", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/public-lesson-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "В своей Kali", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Скачать учебные файлы (.sh) ↓" }),
  ).toBeVisible();
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
