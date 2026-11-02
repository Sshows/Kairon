import { test, expect } from "./member-fixture";

test("first Kali actions stay visible while explanations open from the contents", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/learn/kali-first-boot");
  await expect(
    page.getByRole("complementary", { name: "Задача этого урока" }),
  ).toBeVisible();
  await expect(page.locator(".lesson-action-step").first()).toBeVisible();
  await expect(
    page.getByRole("figure", { name: "Схема открытия терминала в папке" }),
  ).toBeVisible();
  await expect(page.locator(".lesson-markdown")).not.toContainText(
    "kairon-toolbox",
  );
  await expect(
    page.locator(".lesson-markdown blockquote").first(),
  ).toContainText(/звёздоч|звездоч/);
  const explanation = page.locator(".lesson-explanation").first();
  await expect(explanation).not.toHaveAttribute("open", "");
  await page
    .getByRole("link", { name: "Открыть объяснение", exact: true })
    .click();
  await expect(explanation).toHaveAttribute("open", "");
  await explanation.locator("summary").click();
  await page.locator(".lesson-outline summary").click();
  const id = await explanation.getAttribute("id");
  await page.locator(`.lesson-outline a[href="#${id}"]`).click();
  await expect(explanation).toHaveAttribute("open", "");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/first-boot-steps-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
