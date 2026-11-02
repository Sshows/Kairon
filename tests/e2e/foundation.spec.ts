import { test, expect } from "./member-fixture";
import { readFileSync, readdirSync } from "node:fs";
import plan from "../../content/day-plan.json" with { type: "json" };
import cheats from "../../content/source-audits/cheat-sheets.json" with { type: "json" };

type Lesson = {
  id: string;
  title: string;
  answers: string[];
  kind: string;
  choices: { id: string; text: string }[];
  kit: boolean;
};
const lessons: Lesson[] = readdirSync("content/lessons")
  .filter((name) => name.endsWith(".json"))
  .flatMap((name) =>
    JSON.parse(readFileSync("content/lessons/" + name, "utf8")),
  );
const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
const origin = "http://localhost:3000";
const storageKey = "kairon-learning-progress-v1";
async function answerInPage(
  page: import("@playwright/test").Page,
  lesson: Lesson,
) {
  if (lesson.kind === "choice")
    await page
      .getByRole("radio", {
        name: lesson.choices.find((choice) => choice.id === lesson.answers[0])!
          .text,
        exact: true,
      })
      .check();
  else
    await page
      .getByLabel("Ответ по результату практики", { exact: true })
      .fill(lesson.answers[0]);
  await page
    .getByRole("button", { name: "Проверить ответ", exact: true })
    .click();
  await expect(
    page.getByText("Самопроверка пройдена", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Отметка сохранена в аккаунте и будет доступна на другом устройстве после входа.",
      { exact: true },
    ),
  ).toBeVisible();
}

test("first visit has one clear starting action and the actual installation day", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "первого дня",
  );
  await expect(
    page.locator(".continue-learning a[data-slot=button]"),
  ).toHaveCount(1);
  await expect(page.locator(".path-card")).toHaveCount(0);
  await expect(page.locator('a[href="/admin"]')).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/\bXP\b|AI-наставник/);
  await expect(page.locator('footer a[href*="github.com"]')).toHaveCount(0);
  await page.screenshot({ path: "test-results/public-day-home-desktop.png" });
  await page
    .getByRole("link", { name: "Начать первый день", exact: true })
    .click();
  await expect(page).toHaveURL(/\/days\/1$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "День 1.",
  );
  await expect(
    page.locator('a[href="https://www.virtualbox.org/wiki/Downloads"]'),
  ).toBeVisible();
  await expect(
    page.locator(
      'a[href="https://www.kali.org/get-kali/#kali-virtual-machines"]',
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Результат дня" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/public-day-one-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Открыть первый урок этого дня", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp("/learn/" + plan.days[0].lessonIds[0] + "$"),
  );
  await expect(page.locator(".lesson-top")).toContainText("День 1");
});

test("all 76 days and 129 lessons are readable after login", async ({
  page,
}) => {
  await page.goto("/study-plan");
  await expect(page.locator(".day-stage")).toHaveCount(plan.stages.length);
  await expect(page.locator(".day-card")).toHaveCount(plan.totalDays);
  await expect(page.locator(".day-stage").first()).toHaveAttribute("open", "");
  for (let offset = 0; offset < plan.days.length; offset += 6)
    await Promise.all(
      plan.days.slice(offset, offset + 6).map(async (day) => {
        const response = await page.request.get("/days/" + day.day);
        expect(response.status(), String(day.day)).toBe(200);
        expect(await response.text()).toContain("Результат дня");
      }),
    );
  for (let offset = 0; offset < lessons.length; offset += 6)
    await Promise.all(
      lessons.slice(offset, offset + 6).map(async (lesson) => {
        const response = await page.request.get("/learn/" + lesson.id);
        expect(response.status(), lesson.id).toBe(200);
        const html = await response.text();
        expect(html).toContain("Разделы этого урока");
        expect(html).not.toContain("&quot;answers&quot;");
        expect(html).not.toContain('\\"answers\\"');
        const checked = await page.request.post("/api/learning/" + lesson.id, {
          headers: { Origin: origin },
          data: { action: "check", answer: lesson.answers[0] },
        });
        const data = await checked.json();
        expect(data.status, lesson.id).toBe("passed");
        expect(data.guest).toBe(false);
        expect(data.xp).toBeUndefined();
      }),
    );
  for (const value of ["0", "77", "01", "1e1", "-1", "missing"])
    expect((await page.request.get("/days/" + value)).status()).toBe(404);
  const sql = cheats.sections.find(
    (entry) => entry.filename === "SQL_Injection_Prevention_Cheat_Sheet.md",
  )!;
  await page.goto("/web-labs/cheat-sheets/" + sql.id);
  await expect(page.locator(".web-original")).toContainText("Primary Defenses");
  await expect(page.locator(".web-original pre").first()).toBeVisible();
  await page.goto("/materials");
  await expect(page.locator(".materials-grid article")).toHaveCount(7);
  await page.locator(".legacy-course-index summary").click();
  await expect(page.locator(".path-card")).toHaveCount(8);
});

test("members can download unchanged exercises and invalid API input is rejected", async ({
  page,
}) => {
  const zip = await page.request.get("/downloads/kairon-kali-lab.zip");
  expect(zip.status()).toBe(200);
  expect(zip.headers()["cache-control"]).toContain("no-store");
  expect(zip.headers()["content-type"]).toBe("application/zip");
  expect((await zip.body()).subarray(0, 2).toString()).toBe("PK");
  expect(
    (await page.request.get("/labs/kairon-web/practice.py")).status(),
  ).toBe(200);
  expect((await page.request.get("/downloads/not-listed.zip")).status()).toBe(
    404,
  );
  expect(
    (
      await page.request.get(
        "/_next/image?url=%2Flabs%2Fkairon-toolbox%2Fdata%2Fmetadata.png&w=640&q=75",
      )
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post("/api/learning/kali-install", {
        headers: { Origin: "https://other.example" },
        data: { action: "hint" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/learning/kali-install", {
        headers: { Origin: origin },
        data: { mode: "terminal", commands: ["pwd"] },
      })
    ).status(),
  ).toBe(400);
});

test("correct self-checks persist in the account, choose the next day and can be reset", async ({
  page,
}) => {
  const day = plan.days[0];
  const first = byId.get(day.lessonIds[0])!;
  await page.goto("/learn/" + first.id);
  for (let index = 0; index < 3; index++) {
    await page
      .getByRole("button", { name: "Нужна подсказка", exact: true })
      .click();
    await expect(page.locator(".learning-hint")).toContainText(
      `Подсказка ${index + 1}/3`,
    );
  }
  await expect(
    page.getByRole("button", { name: "Все подсказки открыты", exact: true }),
  ).toBeDisabled();
  await answerInPage(page, first);
  const persisted = await (await page.request.get("/api/me")).json();
  expect(persisted.progress.completedLessonIds).toEqual([first.id]);
  await page.reload();
  await expect(
    page.getByText("Самопроверка этого урока уже отмечена", { exact: false }),
  ).toBeVisible();
  await answerInPage(page, first);
  expect(
    (await (await page.request.get("/api/me")).json()).progress
      .completedLessonIds,
  ).toEqual([first.id]);
  for (const id of day.lessonIds.slice(1)) {
    await page.goto("/learn/" + id);
    await answerInPage(page, byId.get(id)!);
  }
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Продолжить день 2", exact: true }),
  ).toHaveAttribute("href", "/days/2");
  await page.goto("/study-plan");
  await expect(page.locator(".day-progress-overview")).toContainText(
    `1 из ${plan.totalDays}`,
  );
  await page.screenshot({
    path: "test-results/public-daily-progress-desktop.png",
  });
  await page.locator(".device-progress-settings summary").click();
  await page
    .getByRole("button", {
      name: "Сбросить мои отметки в аккаунте",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Отмена", exact: true }).click();
  expect(
    (await (await page.request.get("/api/me")).json()).progress
      .completedLessonIds.length,
  ).toBeGreaterThan(0);
  await page
    .getByRole("button", {
      name: "Сбросить мои отметки в аккаунте",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Да, сбросить отметки", exact: true })
    .click();
  await expect(page.locator(".day-progress-overview")).toContainText(
    `0 из ${plan.totalDays}`,
  );
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBeNull();
});

test("blocked browser storage keeps lessons usable", async ({
  page,
  context,
}) => {
  await context.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("blocked", "SecurityError");
      },
    }),
  );
  await page.goto("/");
  const first = byId.get(plan.days[0].lessonIds[0])!;
  await page.goto("/learn/" + first.id);
  await answerInPage(page, first);
  expect(
    (await (await page.request.get("/api/me")).json()).progress
      .completedLessonIds,
  ).toContain(first.id);
});

test("mobile flow has readable days, lesson contents and no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Начать первый день", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Начать первый день", exact: true }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/public-day-home-mobile.png",
    fullPage: true,
  });
  await page.goto("/study-plan");
  await page.locator(".day-stage").last().locator("summary").click();
  await expect(
    page.locator(`a.day-card[href="/days/${plan.totalDays}"]`),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/public-day-plan-mobile.png",
    fullPage: true,
  });
  const studyMethod = page.locator(".study-method");
  await studyMethod.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(studyMethod.locator("ol")).toBeVisible();
  await studyMethod.scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/public-study-method-mobile.png",
  });
  await page.goto("/learn/project-start");
  await page
    .getByText("Как отличить команду от примера результата", { exact: true })
    .click();
  await expect(page.locator(".practice-folder-help")).toContainText(
    "код Python вводят в разных местах",
  );
  await page.locator(".lesson-outline summary").click();
  const pythonSection = page
    .getByRole("navigation", { name: "Разделы этого урока" })
    .getByRole("link", {
      name: /Самостоятельный опыт без изменения исходника/,
    });
  const pythonTarget = await pythonSection.getAttribute("href");
  await pythonSection.click();
  await expect(page.locator(pythonTarget!)).toContainText("hello_practice.py");
  await expect
    .poll(() =>
      page
        .locator(pythonTarget!)
        .evaluate((element) => element.getBoundingClientRect().top),
    )
    .toBeLessThan(160);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/public-python-explanation-mobile.png",
  });
  await page.goto("/learn/basics-ports");
  await page.locator(".lesson-outline summary").click();
  const anchor = page
    .getByRole("navigation", { name: "Разделы этого урока" })
    .getByRole("link", {
      name: "Сделай сейчас: запусти свой сервер и проверь три состояния",
      exact: true,
    });
  const target = await anchor.getAttribute("href");
  await anchor.click();
  await expect
    .poll(() =>
      page
        .locator(target!)
        .evaluate((element) => element.getBoundingClientRect().top),
    )
    .toBeLessThan(160);
  await expect(page.locator(target!)).toContainText("--bind 127.0.0.1");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/public-daily-lesson-mobile.png",
  });
  await page.goto("/days/60");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "День 60",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("the final published day completes the route without a nonexistent next day", async ({
  page,
}) => {
  await page.goto("/");
  const me = await (await page.request.get("/api/me")).json();
  await page.request.post("/api/progress", {
    headers: { Origin: origin },
    data: {
      action: "import",
      accountId: me.user.id,
      lessonIds: plan.days.flatMap((day) => day.lessonIds),
    },
  });
  await page.reload();
  await expect(page.locator(".continue-learning")).toContainText(
    "МАРШРУТ ПРОЙДЕН",
  );
  await expect(page.locator(".continue-learning .day-time")).toHaveCount(0);
  await page.goto(`/days/${plan.totalDays}`);
  await expect(
    page.getByRole("link", { name: "Посмотреть свой маршрут", exact: true }),
  ).toHaveAttribute("href", "/study-plan");
  await expect(
    page.locator(`a[href="/days/${plan.totalDays + 1}"]`),
  ).toHaveCount(0);
  await page.goto("/study-plan");
  await expect(page.locator(".day-progress-overview")).toContainText(
    `${plan.totalDays} из ${plan.totalDays}`,
  );
  await page.screenshot({ path: "test-results/public-route-completed.png" });
});

test("read-only local storage does not prevent server progress across navigation", async ({
  page,
  context,
}) => {
  await context.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("quota", "QuotaExceededError");
    };
    Storage.prototype.removeItem = function () {
      throw new DOMException("readonly", "SecurityError");
    };
  });
  await page.goto("/learn/" + plan.days[0].lessonIds[0]);
  await answerInPage(page, byId.get(plan.days[0].lessonIds[0])!);
  await page
    .getByRole("link", { name: "Kairon — главная", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Продолжить день 2", exact: true }),
  ).toBeVisible();
  expect(
    (await (await page.request.get("/api/me")).json()).progress
      .completedLessonIds,
  ).toContain(plan.days[0].lessonIds[0]);
});
