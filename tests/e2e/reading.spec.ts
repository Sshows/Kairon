import { test, expect } from "./member-fixture";
import catalogue from "../../content/book-courses/catalogue.json" with { type: "json" };
test("book directions provide protected explanations, navigation and mobile practice", async ({
  page,
}) => {
  await page.goto("/study-plan");
  await page
    .getByRole("link", {
      name: "Продолжить обучение по выбранному направлению →",
    })
    .click();
  await expect(page).toHaveURL(/\/reading$/);
  await expect(page.locator(".reading-card")).toHaveCount(5);
  for (const course of catalogue.courses) {
    const index = await page.request.get(`/reading/${course.id}`);
    expect(index.status()).toBe(200);
    expect(await index.text()).toContain(course.book.title);
    for (const lesson of course.lessons) {
      const response = await page.request.get(
        `/reading/${course.id}/${lesson.id}`,
      );
      expect(response.status()).toBe(200);
      expect(response.headers()["cache-control"]).toContain("no-store");
      expect(await response.text()).toContain(
        "На какие главы опирается занятие",
      );
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/reading/automation/log-report");
  await expect(page.locator(".lesson-markdown pre")).toHaveCount(5);
  await page.getByText("Показать ответ и объяснение", { exact: true }).click();
  await expect(page.getByText("Вариант B.", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/public-reading-lesson-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("link", {
      name: "Дальше: Ограниченный HTTP-проверяющий: тайм-ауты, статусы и повторяемость →",
    })
    .click();
  await expect(page).toHaveURL(/\/reading\/automation\/local-http$/);
  await page.goto("/reading/zero-day");
  await expect(
    page.getByText("Передан Sample Chapter", { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/public-reading-course-mobile.png",
    fullPage: true,
  });
  expect((await page.request.get("/reading/missing")).status()).toBe(404);
  expect((await page.request.get("/reading/malware/missing")).status()).toBe(
    404,
  );
});
