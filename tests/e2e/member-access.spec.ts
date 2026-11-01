import { test, expect } from "./member-fixture";
import { Client } from "pg";

test("blocked, unverified, revoked and deleted accounts cannot reuse a signed cookie", async ({
  page,
  learner,
}) => {
  const owner = new Client({ connectionString: process.env.DIRECT_URL });
  await owner.connect();
  try {
    const image = await page.request.get("/images/kali-files.svg");
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toContain("image/svg+xml");
    expect(image.headers()["cache-control"]).toContain("no-store");
    for (const change of [
      'UPDATE public."User" SET blocked=true WHERE id=$1',
      'UPDATE public."User" SET blocked=false,"emailVerifiedAt"=NULL WHERE id=$1',
      'UPDATE public."User" SET "emailVerifiedAt"=now(),"sessionVersion"="sessionVersion"+1 WHERE id=$1',
      'DELETE FROM public."User" WHERE id=$1',
    ]) {
      await owner.query(change, [learner.id]);
      const lesson = await page.request.get("/learn/kali-install", {
        maxRedirects: 0,
      });
      expect(lesson.status()).toBe(307);
      expect(lesson.headers().location).toContain("/login");
      for (const path of [
        "/images/kali-files.svg",
        "/downloads/kairon-kali-lab.zip",
        "/labs/kairon-web/practice.py",
      ]) {
        const denied = await page.request.get(path, { maxRedirects: 0 });
        expect(denied.status(), path).toBe(401);
        expect(denied.headers()["cache-control"]).toContain("no-store");
      }
      expect(
        (
          await page.request.post("/api/learning/kali-install", {
            headers: { Origin: "http://localhost:3000" },
            data: { action: "hint" },
          })
        ).status(),
      ).toBe(401);
    }
  } finally {
    await owner.end();
  }
});

test("login returns to the requested lesson and authenticated glossary still works", async ({
  page,
  context,
  learner,
}) => {
  await context.clearCookies();
  await page.goto("/learn/kali-install");
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByLabel("Электронная почта", { exact: true }).fill(learner.email);
  await page.getByLabel("Пароль", { exact: true }).fill(learner.password);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).toHaveURL(/\/learn\/kali-install$/);
  await page.goto("/glossary");
  await page.getByRole("searchbox").fill("Код и программа");
  await page.locator(".glossary-list summary").click();
  await expect(
    page.getByText("Пошаговая письменная инструкция для компьютера", {
      exact: false,
    }),
  ).toBeVisible();
});
