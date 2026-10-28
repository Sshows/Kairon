import { test, expect } from "@playwright/test";
import { Client } from "pg";
import { randomBytes, randomUUID } from "node:crypto";
import course from "../../content/lessons/kali.json" with { type: "json" };
import company from "../../content/lessons/company.json" with { type: "json" };
import projects from "../../content/lessons/projects.json" with { type: "json" };
import basics from "../../content/lessons/basics.json" with { type: "json" };
import toolsNetwork from "../../content/lessons/kali-practice-network.json" with { type: "json" };
import toolsCrypto from "../../content/lessons/kali-practice-crypto.json" with { type: "json" };
import toolsExtraNetwork from "../../content/lessons/kali-practice-extra-network.json" with { type: "json" };
import toolsExtraFiles from "../../content/lessons/kali-practice-extra-files.json" with { type: "json" };
const practice = [
  ...toolsNetwork,
  ...toolsCrypto,
  ...toolsExtraNetwork,
  ...toolsExtraFiles,
];
import diagnostics from "../../content/lessons/diagnostics.json" with { type: "json" };
import analysis from "../../content/lessons/analysis.json" with { type: "json" };
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
      await submit(practice[1].id, {
        action: "check",
        answer: practice[1].answers[0],
      })
    ).status(),
  ).toBe(423);
  for (const response of await Promise.all(
    Array.from({ length: 4 }, () =>
      submit(practice[0].id, {
        action: "check",
        answer: practice[0].answers[0],
      }),
    ),
  ))
    expect((await response.json()).status).toBe("passed");
  expect(
    (
      await submit(diagnostics[1].id, {
        action: "check",
        answer: diagnostics[1].answers[0],
      })
    ).status(),
  ).toBe(423);
  for (const response of await Promise.all(
    Array.from({ length: 4 }, () =>
      submit(diagnostics[0].id, {
        action: "check",
        answer: diagnostics[0].answers[0],
      }),
    ),
  ))
    expect((await response.json()).status).toBe("passed");
  expect(
    (
      await submit(analysis[1].id, {
        action: "check",
        answer: analysis[1].answers[0],
      })
    ).status(),
  ).toBe(423);
  for (const response of await Promise.all(
    Array.from({ length: 4 }, () =>
      submit(analysis[0].id, {
        action: "check",
        answer: analysis[0].answers[0],
      }),
    ),
  ))
    expect((await response.json()).status).toBe("passed");
  expect(
    (
      await submit(basics[1].id, {
        action: "check",
        answer: basics[1].answers[0],
      })
    ).status(),
  ).toBe(423);
  for (const response of await Promise.all(
    Array.from({ length: 4 }, () =>
      submit(basics[0].id, { action: "check", answer: basics[0].answers[0] }),
    ),
  ))
    expect((await response.json()).status).toBe("passed");
  expect(
    (
      await submit(projects[1].id, {
        action: "check",
        answer: projects[1].answers[0],
      })
    ).status(),
  ).toBe(423);
  for (const response of await Promise.all(
    Array.from({ length: 4 }, () =>
      submit(projects[0].id, {
        action: "check",
        answer: projects[0].answers[0],
      }),
    ),
  ))
    expect((await response.json()).status).toBe("passed");
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
  for (const lesson of projects.slice(1)) {
    const result = await submit(lesson.id, {
      action: "check",
      answer: lesson.answers[0],
    });
    expect((await result.json()).status, lesson.id).toBe("passed");
  }
  expect(
    (
      await (
        await submit(projects[0].id, {
          action: "check",
          answer: projects[0].answers[0],
        })
      ).json()
    ).already,
  ).toBe(true);
  for (const lesson of diagnostics.slice(1)) {
    const response = await submit(lesson.id, {
      action: "check",
      answer: lesson.answers[0],
    });
    expect((await response.json()).status, lesson.id).toBe("passed");
  }
  expect(
    (
      await (
        await submit(diagnostics[0].id, {
          action: "check",
          answer: diagnostics[0].answers[0],
        })
      ).json()
    ).already,
  ).toBe(true);
  for (const lesson of practice.slice(1)) {
    const response = await submit(lesson.id, {
      action: "check",
      answer: lesson.answers[0],
    });
    expect((await response.json()).status, lesson.id).toBe("passed");
  }
  expect(
    (
      await (
        await submit(practice[0].id, {
          action: "check",
          answer: practice[0].answers[0],
        })
      ).json()
    ).already,
  ).toBe(true);
  const progressDb = new Client({ connectionString: process.env.DIRECT_URL });
  for (const lesson of analysis.slice(1)) {
    const result = await submit(lesson.id, {
      action: "check",
      answer: lesson.answers[0],
    });
    expect((await result.json()).status, lesson.id).toBe("passed");
  }
  expect(
    (
      await (
        await submit(analysis[0].id, {
          action: "check",
          answer: analysis[0].answers[0],
        })
      ).json()
    ).already,
  ).toBe(true);
  for (const lesson of basics.slice(1)) {
    const result = await submit(lesson.id, {
      action: "check",
      answer: lesson.answers[0],
    });
    expect((await result.json()).status, lesson.id).toBe("passed");
  }
  expect(
    (
      await (
        await submit(basics[0].id, {
          action: "check",
          answer: basics[0].answers[0],
        })
      ).json()
    ).already,
  ).toBe(true);
  try {
    await progressDb.connect();
    const result = await progressDb.query(
      'SELECT count(*)::int AS count,sum("awardedXp")::int AS xp FROM "LessonProgress" WHERE "userId"=$1 AND "completedAt" IS NOT NULL',
      [learner.id],
    );
    expect(result.rows[0]).toEqual({ count: 93, xp: 9610 });
  } finally {
    await progressDb.end();
  }
  await page.goto("/profile");
  await expect(page.locator(".learning-stats")).toContainText("92/92");
  await expect(page.locator(".learning-stats")).toContainText("9610");
  await expect(page.locator('[data-course="kali-practice"]')).toContainText(
    "24/24",
  );
  await expect(page.locator('[data-course="diagnostics"]')).toContainText(
    "8/8",
  );
  await expect(page.locator('[data-course="file-analysis"]')).toContainText(
    "8/8",
  );
  await expect(page.locator('[data-course="security-basics"]')).toContainText(
    "12/12",
  );
  await expect(page.locator('[data-course="kali-tools"]')).toContainText("8/8");
  await expect(
    page.getByText("Все пути завершены", { exact: true }),
  ).toBeVisible();
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
  await expect(page.locator(".learning-stats")).toContainText("92/92");
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
      name: course[0].title,
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

test("all project references and beginner guide work on desktop and mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/projects");
  await expect(page.locator(".project-card")).toHaveCount(69);
  await page
    .getByLabel("Что есть у автора", { exact: true })
    .selectOption("idea");
  await expect(page.locator(".project-card")).toHaveCount(26);
  await page
    .getByLabel("Что есть у автора", { exact: true })
    .selectOption("source");
  await expect(page.locator(".project-card")).toHaveCount(43);
  await page
    .getByLabel("Что есть у автора", { exact: true })
    .selectOption("all");
  await page
    .getByRole("searchbox", { name: "Найти проект", exact: true })
    .fill("Caesar");
  await expect(page.locator(".project-card")).toHaveCount(1);
  await expect(page.locator(".project-card")).toContainText("Цезаря");
  await page
    .getByRole("searchbox", { name: "Найти проект", exact: true })
    .fill("");
  await page.screenshot({ path: "test-results/public-projects-desktop.png" });
  const links = await page
    .locator(".project-card h2 a")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")!));
  expect(new Set(links).size).toBe(69);
  for (const href of links)
    expect((await page.request.get(href)).status(), href).toBe(200);
  await page.goto("/projects/hash-identifier");
  await expect(
    page.getByRole("heading", { name: "План самостоятельного проекта" }),
  ).toBeVisible();
  await expect(page.locator(".project-steps li")).toHaveCount(4);
  await page.goto("/paths/kali-tools");
  await expect(page.locator(".course-lessons > a")).toHaveCount(8);
  await expect(page.locator(".course-module")).toHaveCount(2);
  const zip = await page.request.get("/downloads/kairon-projects.zip");
  expect(zip.status()).toBe(200);
  expect((await zip.body()).subarray(0, 2).toString()).toBe("PK");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/projects");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/learn/project-start");
  await expect(page.locator(".guide-kit-link")).toHaveAttribute(
    "href",
    "/downloads/kairon-projects.zip",
  );
  await expect(
    page.getByRole("heading", { name: projects[0].title, exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByLabel("Ответ по результату практики", { exact: true })
    .fill(projects[0].answers[0]);
  await page
    .getByRole("button", { name: "Проверить ответ", exact: true })
    .click();
  await expect(
    page.getByText("Самопроверка пройдена", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/public-projects-mobile.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Следующий урок", exact: true }).click();
  await expect(page).toHaveURL(/learn\/project-hash/);
  await page.goto("/sources/carter-projects");
  await expect(
    page.getByRole("heading", {
      name: "Что добавили из Cybersecurity-Projects",
    }),
  ).toBeVisible();
});

test("study map connects all directions and foundation lessons on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator(".path-card")).toHaveCount(9);
  await page
    .getByRole("link", { name: "Начать обучение", exact: true })
    .click();
  await expect(page).toHaveURL(/study-plan/);
  await expect(page.locator(".study-stage")).toHaveCount(8);
  await expect(page.locator(".study-direction-card")).toHaveCount(25);
  const routeLinks = await page
    .locator(".study-direction-card h3 a")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")!));
  for (const href of routeLinks)
    expect((await page.request.get(href)).status(), href).toBe(200);
  await page
    .getByRole("searchbox", { name: "Найти направление обучения" })
    .fill("Управляем доступом людей");
  await expect(page.locator(".study-direction-card")).toHaveCount(1);
  await page
    .getByRole("searchbox", { name: "Найти направление обучения" })
    .fill("");
  await page.screenshot({ path: "test-results/public-study-plan-desktop.png" });
  await page.goto("/study-plan/iam-security");
  await expect(page.locator(".study-lesson-links a")).toHaveCount(3);
  await page.goto("/sources/study-plans");
  await expect(page.locator(".study-source-block")).toHaveCount(2);
  await expect(page.locator(".study-source-sections article")).toHaveCount(46);
  await page.goto("/paths/security-basics");
  await expect(page.locator(".course-lessons > a")).toHaveCount(12);
  await expect(page.locator(".course-module")).toHaveCount(3);
  const download = await page.request.get("/downloads/kairon-basics.zip");
  expect(download.status()).toBe(200);
  expect((await download.body()).subarray(0, 2).toString()).toBe("PK");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/study-plan");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/learn/basics-cia");
  await expect(page.locator(".guide-kit-link")).toHaveAttribute(
    "href",
    "/downloads/kairon-basics.zip",
  );
  await page
    .getByLabel("Ответ по результату практики", { exact: true })
    .fill(basics[0].answers[0]);
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
    path: "test-results/public-foundations-mobile.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Следующий урок", exact: true }).click();
  await expect(page).toHaveURL(/learn\/basics-risk/);
});

test("reference library and file investigation explain evidence without executable samples", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/library");
  await expect(page.locator(".library-card")).toHaveCount(21);
  const firstTitle = (
    await page.locator(".library-card h2").first().innerText()
  ).trim();
  await page
    .getByRole("searchbox", { name: "Найти задачу или область защиты" })
    .fill(firstTitle);
  await expect(page.locator(".library-card")).toHaveCount(1);
  await page
    .getByRole("searchbox", { name: "Найти задачу или область защиты" })
    .fill("");
  await page.screenshot({ path: "test-results/public-library-desktop.png" });
  const links = await page
    .locator(".library-card h2 a")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")!));
  for (const href of links)
    expect((await page.request.get(href)).status(), href).toBe(200);
  await page.goto("/sources/malware-bible");
  await expect(page.locator(".reference-source-grid article")).toHaveCount(25);
  await expect(
    page
      .locator(".reference-source-grid article")
      .filter({ hasText: "Пока заготовка" }),
  ).toHaveCount(6);
  await page.goto("/sources/paul-cybersecurity");
  await expect(page.locator(".reference-source-grid article")).toHaveCount(21);
  await page.goto("/paths/file-analysis");
  await expect(page.locator(".course-lessons > a")).toHaveCount(8);
  await expect(page.locator(".course-module")).toHaveCount(2);
  const download = await page.request.get("/downloads/kairon-analysis.zip");
  expect(download.status()).toBe(200);
  expect((await download.body()).subarray(0, 2).toString()).toBe("PK");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/library");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/learn/analysis-intake");
  await expect(page.locator(".guide-kit-link")).toHaveAttribute(
    "href",
    "/downloads/kairon-analysis.zip",
  );
  await expect(
    page.getByLabel("Команда терминала", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Ответ по результату практики", { exact: true })
    .fill(analysis[0].answers[0]);
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
    path: "test-results/public-analysis-mobile.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Следующий урок", exact: true }).click();
  await expect(page).toHaveURL(/analysis-filetype/);
});

test("knowledge collections connect both complete indexes to diagnostics practice", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/collections");
  await expect(page.locator(".collection-card")).toHaveCount(96);
  await page
    .getByLabel("Источник", { exact: true })
    .selectOption("awesome-hacking");
  await expect(page.locator(".collection-card")).toHaveCount(81);
  await page
    .getByLabel("Источник", { exact: true })
    .selectOption("secret-knowledge");
  await expect(page.locator(".collection-card")).toHaveCount(15);
  const title = (
    await page.locator(".collection-card h2").first().innerText()
  ).trim();
  await page
    .getByRole("searchbox", { name: "Найти тему в подборках" })
    .fill(title);
  await expect(page.locator(".collection-card")).toHaveCount(1);
  await page
    .getByRole("searchbox", { name: "Найти тему в подборках" })
    .fill("");
  await page.getByLabel("Источник", { exact: true }).selectOption("");
  const links = await page
    .locator(".collection-card h2 a")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")!));
  for (let offset = 0; offset < links.length; offset += 4)
    for (const response of await Promise.all(
      links.slice(offset, offset + 4).map((href) => page.request.get(href)),
    ))
      expect(response.status()).toBe(200);
  await page.screenshot({
    path: "test-results/public-collections-desktop.png",
  });
  await page.goto(links[0]);
  await expect(page.locator(".study-example")).toContainText(/./);
  expect(await page.locator(".study-lesson-links a").count()).toBeGreaterThan(
    0,
  );
  for (const [source, count] of [
    ["awesome-hacking", 81],
    ["secret-knowledge", 15],
  ] as const) {
    await page.goto("/sources/" + source);
    await expect(page.locator(".reference-source-grid article")).toHaveCount(
      count,
    );
  }
  await page.goto("/paths/diagnostics");
  await expect(page.locator(".course-lessons > a")).toHaveCount(8);
  await expect(page.locator(".course-module")).toHaveCount(2);
  const download = await page.request.get("/downloads/kairon-diagnostics.zip");
  expect(download.status()).toBe(200);
  expect((await download.body()).subarray(0, 2).toString()).toBe("PK");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/collections");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/learn/diag-intake");
  await expect(page.locator(".guide-kit-link")).toHaveAttribute(
    "href",
    "/downloads/kairon-diagnostics.zip",
  );
  await expect(
    page.getByLabel("Команда терминала", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Ответ по результату практики", { exact: true })
    .fill(diagnostics[0].answers[0]);
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
    path: "test-results/public-diagnostics-mobile.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Следующий урок", exact: true }).click();
  await expect(page).toHaveURL(/diag-scope/);
});

test("tool guides explain mechanisms and link to hands-on local Kali lessons", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/toolbox");
  await expect(page.locator(".tool-card")).toHaveCount(19);
  await page
    .getByRole("searchbox", { name: "Найти инструмент Kali" })
    .fill("на каком порту отвечает своя программа");
  await expect(page.locator(".tool-card")).toHaveCount(1);
  await page.getByRole("searchbox", { name: "Найти инструмент Kali" }).fill("");
  const links = await page
    .locator(".tool-card h2 a")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")!));
  await page.screenshot({ path: "test-results/public-toolbox-desktop.png" });
  for (const link of links) {
    await page.goto(link);
    await expect(page.locator(".tool-mechanism")).toContainText(/./);
    expect(
      await page.locator(".tool-steps > li").count(),
    ).toBeGreaterThanOrEqual(3);
    expect(await page.locator(".study-lesson-links a").count()).toBeGreaterThan(
      0,
    );
  }
  await page.goto("/sources/labex-kali");
  await expect(page.locator(".reference-source-grid article")).toHaveCount(36);
  await page.goto("/paths/kali-practice");
  await expect(page.locator(".course-lessons > a")).toHaveCount(24);
  await expect(page.locator(".course-module")).toHaveCount(4);
  const download = await page.request.get("/downloads/kairon-toolbox.zip");
  expect(download.status()).toBe(200);
  expect((await download.body()).subarray(0, 2).toString()).toBe("PK");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(links[0]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/learn/tools-start");
  await expect(page.locator(".guide-kit-link")).toHaveAttribute(
    "href",
    "/downloads/kairon-toolbox.zip",
  );
  await expect(
    page.getByLabel("Команда терминала", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Ответ по результату практики", { exact: true })
    .fill(practice[0].answers[0]);
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
    path: "test-results/public-tools-mobile.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Следующий урок", exact: true }).click();
  await expect(page).toHaveURL(/tools-nmap/);
});

test("detailed lessons offer usable contents and retain their command walkthroughs", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/learn/basics-ports");
  const contents = page.getByRole("navigation", {
    name: "Разделы этого урока",
  });
  const startServer = contents.getByRole("link", {
    name: "2. Запусти собственный сервер",
    exact: true,
  });
  const target = await startServer.getAttribute("href");
  await startServer.click();
  await expect(page.locator(target!)).toContainText("--bind 127.0.0.1");
  await expect(page).toHaveURL(new RegExp(target! + "$"));
  await expect
    .poll(() =>
      page
        .locator(target!)
        .evaluate((element) => element.getBoundingClientRect().top),
    )
    .toBeLessThan(160);
  await page.screenshot({
    path: "test-results/public-ports-walkthrough-desktop.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/learn/soc-login-chain");
  const mobileContents = page.getByRole("navigation", {
    name: "Разделы этого урока",
  });
  const links = mobileContents.getByRole("link");
  expect(await links.count()).toBeGreaterThan(3);
  const firstTarget = await links.first().getAttribute("href");
  await links.first().click();
  await expect(page.locator(firstTarget!)).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(firstTarget!)
        .evaluate((element) => element.getBoundingClientRect().top),
    )
    .toBeLessThan(160);
  await expect(page.locator(".lesson-markdown")).toContainText("logon_type");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/public-company-explanation-mobile.png",
  });
});

test("the additional Kali levels expose full practice and readable tool guides on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/paths/kali-practice");
  await expect(page.locator(".course-lessons > a")).toHaveCount(24);
  await expect(page.locator(".course-module")).toHaveCount(4);
  await page.locator('a[href="#level-3"]').click();
  await expect(page.locator("#level-3")).toContainText("curl");
  await page.screenshot({
    path: "test-results/public-extra-tools-desktop.png",
  });
  for (const lesson of [...toolsExtraNetwork, ...toolsExtraFiles]) {
    const response = await page.request.get("/learn/" + lesson.id);
    expect(response.status(), lesson.id).toBe(200);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/toolbox/burpsuite");
  await expect(page.locator(".tool-mechanism")).toContainText(/./);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/learn/tools-curl");
  const folderHelp = page.getByRole("complementary", {
    name: "Как найти свою папку практики",
  });
  await expect(folderHelp).toContainText("а не имя компьютера");
  await folderHelp.locator("summary").click();
  await expect(folderHelp).toContainText("Открыть терминал здесь");
  await expect(folderHelp).toContainText("pwd");
  await page
    .getByLabel("Ответ по результату практики", { exact: true })
    .fill("200");
  await page
    .getByRole("button", { name: "Проверить ответ", exact: true })
    .click();
  await expect(
    page.getByText("Самопроверка пройдена", { exact: true }),
  ).toBeVisible();
  const section = page.locator(".lesson-text-section").first();
  const target = await section.getAttribute("id");
  await page.locator(`a[href="#${target}"]`).click();
  await expect
    .poll(() =>
      section.evaluate((element) => element.getBoundingClientRect().top),
    )
    .toBeLessThan(160);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/public-extra-tools-mobile.png" });
});
