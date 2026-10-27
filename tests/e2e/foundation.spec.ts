import { test, expect } from "@playwright/test";
import { Client } from "pg";
import { randomBytes, randomUUID } from "node:crypto";
import course from "../../content/lessons/kali.json" with { type: "json" };
import company from "../../content/lessons/company.json" with { type: "json" };
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
      await submit(company[1].id, {
        action: "check",
        answer: company[1].answers[0],
      })
    ).status(),
  ).toBe(423);
  // The second path starts independently, even before completing any Kali lesson.
  const firstCompany = await Promise.all(
    Array.from({ length: 4 }, () =>
      submit(company[0].id, { action: "check", answer: company[0].answers[0] }),
    ),
  );
  for (const result of firstCompany)
    expect((await result.json()).status).toBe("passed");
  expect(
    (
      await submit("kali-first-boot", { action: "check", answer: "normal" })
    ).status(),
  ).toBe(423);
  const crossOrigin = await page.request.post("/api/learning/kali-install", {
    headers: { Origin: "https://example.com" },
    data: { action: "check", answer: "vbox" },
  });
  expect(crossOrigin.status()).toBe(403);
  const completed = await Promise.all(
    Array.from({ length: 4 }, () =>
      submit("kali-install", { action: "check", answer: "vbox" }),
    ),
  );
  for (const result of completed)
    expect((await result.json()).status).toBe("passed");
  const invalid = await submit("kali-first-boot", {
    action: "check",
    commands: ["pwd"],
    mode: "browser",
  });
  expect(invalid.status()).toBe(400);
  expect(
    (
      await (
        await submit("kali-first-boot", { action: "check", answer: "reboot" })
      ).json()
    ).status,
  ).toBe("failed");
  for (let index = 0; index < 4; index++) {
    const hint = await submit("kali-first-boot", { action: "hint" });
    expect((await hint.json()).hintsUsed).toBe(Math.min(index + 1, 3));
  }
  await page.goto("/learn/kali-first-boot");
  await page
    .getByRole("radio", {
      name: "Продолжить ввод и нажать Enter — это нормально",
    })
    .check();
  await page
    .getByRole("button", { name: "Проверить ответ", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Ответ верный", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Разбор", exact: true }),
  ).toBeVisible();
  for (const lesson of course.slice(2)) {
    const result = await submit(lesson.id, {
      action: "check",
      answer: lesson.answers[0],
    });
    const checked = await result.json();
    expect(checked.status, lesson.id).toBe("passed");
    expect(checked.debrief).toBeTruthy();
  }
  await submit("final-case", { action: "check", answer: "203.0.113.44" });
  const ownerDb = new Client({ connectionString: process.env.DIRECT_URL });
  try {
    await ownerDb.connect();
    const result = await ownerDb.query(
      'SELECT count(*)::int AS count,sum("awardedXp")::int AS xp FROM "LessonProgress" WHERE "userId"=$1 AND "completedAt" IS NOT NULL AND "lessonId"=ANY($2::text[])',
      [learner.id, course.map((lesson) => lesson.id)],
    );
    expect(result.rows[0]).toEqual({ count: 20, xp: 2100 });
    // Existing results stay in history; only active IDs count toward 20 current lessons.
    await ownerDb.query(
      'INSERT INTO "LessonProgress" (id,"userId","lessonId","completedAt","awardedXp","updatedAt") VALUES ($1,$2,$3,now(),$4,now())',
      [randomUUID(), learner.id, "permission", 50],
    );
  } finally {
    await ownerDb.end();
  }
  for (const lesson of company.slice(1)) {
    const result = await submit(lesson.id, {
      action: "check",
      answer: lesson.answers[0],
    });
    expect((await result.json()).status, lesson.id).toBe("passed");
  }
  const repeatedCompany = await submit(company[0].id, {
    action: "check",
    answer: company[0].answers[0],
  });
  expect((await repeatedCompany.json()).already).toBe(true);
  const progressDb = new Client({ connectionString: process.env.DIRECT_URL });
  try {
    await progressDb.connect();
    const result = await progressDb.query(
      'SELECT count(*)::int AS count,sum("awardedXp")::int AS xp FROM "LessonProgress" WHERE "userId"=$1 AND "completedAt" IS NOT NULL',
      [learner.id],
    );
    expect(result.rows[0]).toEqual({ count: 33, xp: 3510 });
  } finally {
    await progressDb.end();
  }
  await page.goto("/profile");
  await expect(page.locator(".learning-stats")).toContainText("32/32");
  await expect(page.locator(".learning-stats")).toContainText("3510");
  await expect(page.locator('[data-course="from-zero"]')).toContainText(
    "20/20",
  );
  await expect(page.locator('[data-course="blue-team"]')).toContainText(
    "12/12",
  );
  await expect(
    page.getByText("XP за прежние уроки сохранены", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".learning-stats")).toContainText("32/32");
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
test("public Kali guide has downloads, guest self-check, and no embedded terminal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/terminal");
  await expect(page).toHaveURL(/kali-install/);
  await expect(
    page.getByRole("heading", {
      name: "Готовая Kali: скачать, открыть, запустить",
    }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Команда терминала", { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('a[href="/terminal"]')).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Разбор", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("radio", { name: ".vbox — настройки готовой машины" })
    .check();
  await page
    .getByRole("button", { name: "Проверить ответ", exact: true })
    .click();
  await expect(
    page.getByText("Самопроверка пройдена", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Следующий урок", exact: true }).click();
  await expect(page).toHaveURL(/kali-first-boot/);
  await page.goto("/learn/kali-install");
  await page.screenshot({
    path: "test-results/public-kali-desktop.png",
    fullPage: true,
  });
  await page.goto("/paths/from-zero");
  await expect(page.locator(".course-lessons > a")).toHaveCount(20);
  await expect(page.locator(".course-module")).toHaveCount(4);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/learn/lab-files");
  const download = await page.request.get("/downloads/kairon-kali-lab.zip");
  expect(download.status()).toBe(200);
  expect((await download.body()).subarray(0, 2).toString()).toBe("PK");
  await expect(
    page.getByRole("link", {
      name: "Скачать учебный набор для Kali",
      exact: true,
    }),
  ).toBeVisible();
  const answer = page.getByLabel("Ответ по результату практики", {
    exact: true,
  });
  await answer.fill("wrong");
  await page
    .getByRole("button", { name: "Проверить ответ", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Пока не совпало");
  await page
    .getByRole("button", { name: "Нужна подсказка", exact: true })
    .click();
  await expect(
    page.getByText("Подсказка 1/3:", { exact: false }),
  ).toBeVisible();
  await answer.fill("KLR-READY-2026");
  await page
    .getByRole("button", { name: "Проверить ответ", exact: true })
    .click();
  await expect(
    page.getByText("Самопроверка пройдена", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/public-kali-mobile.png",
    fullPage: true,
  });
  await page.goto("/resources");
  await expect(
    page.getByRole("heading", {
      name: "Книги, инструменты и следующие проекты",
    }),
  ).toBeVisible();
  await expect(page.locator(".resource-list article")).toHaveCount(5);
  await page.goto("/learn/permission");
  await expect(page).toHaveURL(/kali-install/);
});
test("company path keeps its own lessons, downloads, source review and navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/paths/blue-team");
  await expect(
    page.getByRole("heading", {
      name: "Безопасность в компании: первая смена",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".course-lessons > a")).toHaveCount(12);
  await expect(page.locator(".course-module")).toHaveCount(3);
  await page.screenshot({
    path: "test-results/public-company-desktop.png",
    fullPage: true,
  });
  await page.goto("/sources/pocket-hacker");
  await expect(page.locator(".source-lesson-list article")).toHaveCount(12);
  await expect(page.locator(".source-index a")).toHaveCount(258);
  await page.locator(".source-index summary").click();
  await expect(
    page.locator('.source-index a[href="https://t.me/PocketHackerOne/1"]'),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/learn/company-final-case");
  const next = page.getByRole("link", {
    name: "Вернуться к программе",
    exact: true,
  });
  await expect(next).toHaveAttribute("href", "/paths/blue-team");
  await expect(page.locator(".guide-kit-link")).toHaveAttribute(
    "href",
    "/downloads/kairon-company-lab.zip",
  );
  await expect(
    page.locator('a[href="/downloads/kairon-kali-lab.zip"]'),
  ).toHaveCount(0);
  await page
    .getByLabel("Ответ по результату практики", { exact: true })
    .fill(company.at(-1)!.answers[0]);
  await page
    .getByRole("button", { name: "Проверить ответ", exact: true })
    .click();
  await expect(
    page.getByText("Самопроверка пройдена", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/public-company-mobile.png",
    fullPage: true,
  });
  await next.click();
  await expect(page).toHaveURL(/paths\/blue-team/);
  const zip = await page.request.get("/downloads/kairon-company-lab.zip");
  expect(zip.status()).toBe(200);
  expect((await zip.body()).subarray(0, 2).toString()).toBe("PK");
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
