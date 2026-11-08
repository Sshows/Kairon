import { test, expect } from "./member-fixture";
import catalogue from "../../content/book-courses/catalogue.json" with { type: "json" };
import plan from "../../content/day-plan.json" with { type: "json" };

test("every legacy reading URL leads to a protected canonical day or lesson", async ({
  page,
}) => {
  const index = await page.request.get("/reading", { maxRedirects: 0 });
  expect(index.status()).toBe(308);
  expect(index.headers().location).toBe("/study-plan");
  for (const course of catalogue.courses) {
    const firstDay = plan.days.find((day) =>
      day.lessonIds.includes(course.lessons[0].id),
    )!.day;
    const overview = await page.request.get(`/reading/${course.id}`, {
      maxRedirects: 0,
    });
    expect(overview.status()).toBe(308);
    expect(overview.headers().location).toBe(`/days/${firstDay}`);
    for (const lesson of course.lessons) {
      const response = await page.request.get(
        `/reading/${course.id}/${lesson.id}`,
        { maxRedirects: 0 },
      );
      expect(response.status(), lesson.id).toBe(308);
      expect(response.headers().location).toBe(`/learn/${lesson.id}`);
      expect(response.headers()["cache-control"]).toContain("no-store");
    }
  }
  expect((await page.request.get("/reading/missing")).status()).toBe(404);
  expect((await page.request.get("/reading/malware/missing")).status()).toBe(
    404,
  );
  await page.goto("/days/60");
  await expect(
    page.getByRole("link", { name: "Следующий день: 61", exact: true }),
  ).toHaveAttribute("href", "/days/61");
});

test("integrated book check saves to the account and retains readable mobile code", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/reading/automation/log-report");
  await expect(page).toHaveURL(/\/learn\/log-report$/);
  await expect(page.locator(".lesson-top")).toContainText("День 65");
  await expect(page.locator(".lesson-markdown pre")).toHaveCount(5);
  const lesson = catalogue.courses.find((c) => c.id === "automation")!
    .lessons[0];
  await page
    .getByRole("radio", {
      name: lesson.check.choices.find((c) => c.id === lesson.check.answer)!
        .text,
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Проверить ответ", exact: true })
    .click();
  await expect(
    page.getByText("Самопроверка пройдена", { exact: true }),
  ).toBeVisible();
  expect(
    (await (await page.request.get("/api/me")).json()).progress
      .completedLessonIds,
  ).toContain("log-report");
  await page.reload();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Самопроверка этого урока уже отмечена" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/public-integrated-book-mobile.png",
    fullPage: true,
  });
  await page.goto("/learn/crypto-block-stream-modes");
  await expect(page.locator(".lesson-top")).toContainText("День 71");
  await expect(page.locator(".lesson-markdown")).toContainText(
    "один ключ и один начальный счётчик",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/public-day-71-mobile.png",
    fullPage: true,
  });
});

test("day 76 bookmark and completion survive a second device with the same account", async ({
  page,
  browser,
  learner,
}) => {
  await page.goto("/days/76");
  await page.getByLabel("Я закончил день 76").click();
  await expect(page.getByLabel("Я закончил день 76")).toBeChecked();
  await page.locator(".study-bookmark summary").click();
  await page
    .getByLabel("Моя заметка")
    .fill("Продолжить с преобразования перед sink");
  await page
    .getByRole("button", { name: "Сохранить место", exact: true })
    .click();
  await expect(
    page.getByText("Закладка и заметка сохранены в аккаунте.", { exact: true }),
  ).toBeVisible();
  const device = await browser.newContext({ baseURL: "http://localhost:3000" });
  try {
    const csrf = await (await device.request.get("/api/auth/csrf")).json();
    await device.request.post("/api/auth/callback/credentials", {
      headers: {
        "X-Auth-Return-Redirect": "1",
        Origin: "http://localhost:3000",
      },
      form: {
        email: learner.email,
        password: learner.password,
        csrfToken: csrf.csrfToken,
        callbackUrl: "http://localhost:3000/study-plan",
      },
    });
    const me = await (await device.request.get("/api/me")).json();
    expect(me.user.id).toBe(learner.id);
    expect(me.progress.completedDays).toEqual([76]);
    expect(me.progress.bookmark).toMatchObject({
      day: 76,
      note: "Продолжить с преобразования перед sink",
    });
    const second = await device.newPage();
    await second.goto("/profile");
    await expect(second.locator(".profile-stats")).toContainText("1 / 88");
    await expect(second.locator(".profile-stats")).toContainText("0 / 153");
  } finally {
    await device.close();
  }
});
