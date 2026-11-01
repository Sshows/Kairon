import {
  test,
  expect,
  type BrowserContext,
  type APIRequestContext,
} from "@playwright/test";
import { randomUUID, createHmac } from "node:crypto";
import { Client } from "pg";
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
const origin = "http://localhost:3000";
const password = "Kairon-test-only-passphrase-2026";
const emails = [0, 1].map((n) => `e2e-${randomUUID()}-${n}@example.test`);
const key = (value: string) =>
  createHmac("sha256", process.env.AUTH_SECRET!).update(value).digest("hex");
const limiterKeys = [
  "mail-ip:local",
  "mail-global:gmail",
  "verify-ip:local",
  "login-ip:local",
  ...emails.flatMap((email) => [
    `mail-minute:${email}`,
    `mail-email:${email}`,
    email,
  ]),
].map(key);
let owner: Client;
test.beforeAll(async () => {
  if (
    process.env.KAIRON_TEST_MAIL !== "1" ||
    process.env.VERCEL ||
    process.env.AUTH_URL !== origin
  )
    throw new Error(
      "Account browser checks require isolated test configuration.",
    );
  owner = new Client({ connectionString: process.env.DIRECT_URL });
  await owner.connect();
});
test.afterAll(async () => {
  await owner.query(
    'DELETE FROM public."EmailChallenge" WHERE email=ANY($1::text[])',
    [emails],
  );
  await owner.query('DELETE FROM public."User" WHERE email=ANY($1::text[])', [
    emails,
  ]);
  await owner.query(
    'DELETE FROM public."LoginAttempt" WHERE key=ANY($1::text[])',
    [limiterKeys],
  );
  await owner.end();
});
async function mailCode(request: APIRequestContext, email: string) {
  const response = await request.get(
    `http://127.0.0.1:8026/messages?email=${encodeURIComponent(email)}`,
  );
  const messages = await response.json();
  expect(messages).toHaveLength(1);
  expect(messages[0].code).toMatch(/^\d{6}$/);
  return messages[0].code as string;
}
async function register(request: APIRequestContext, email: string) {
  const response = await request.post("/api/account", {
    headers: { Origin: origin },
    data: { action: "register", email, name: "Second learner", password },
  });
  expect(response.status()).toBe(200);
  const { challengeId } = await response.json();
  const verified = await request.post("/api/account", {
    headers: { Origin: origin },
    data: {
      action: "verify",
      challengeId,
      code: await mailCode(request, email),
    },
  });
  expect(verified.status()).toBe(200);
}
async function login(context: BrowserContext, email: string, value = password) {
  const csrf = await (await context.request.get("/api/auth/csrf")).json();
  await context.request.post("/api/auth/callback/credentials", {
    headers: { "X-Auth-Return-Redirect": "1", Origin: origin },
    form: {
      csrfToken: csrf.csrfToken,
      email,
      password: value,
      callbackUrl: origin + "/study-plan",
    },
  });
  const me = await (await context.request.get("/api/me")).json();
  expect(me.user?.email).toBe(email);
  return me.user.id as string;
}

test("email registration, isolated accounts, cross-device resume, logout and recovery", async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(180000);
  const unauthorized = await page.request.post("/api/progress", {
    headers: { Origin: origin },
    data: { accountId: randomUUID(), action: "day", day: 1, complete: true },
  });
  expect(unauthorized.status()).toBe(401);
  expect(
    (
      await page.request.post("/api/account", {
        headers: { Origin: "https://other.example" },
        data: { action: "reset", email: emails[0] },
      })
    ).status(),
  ).toBe(403);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Создать аккаунт", exact: true })
    .click();
  await page.getByLabel("Электронная почта").fill(emails[0]);
  await page.getByLabel("Как к вам обращаться").fill("Первый ученик");
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.screenshot({
    path: "test-results/public-account-register-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Получить код на почту", exact: true })
    .click();
  await expect(page.getByLabel("Код из письма")).toBeVisible();
  expect(
    (
      await owner.query('SELECT id FROM public."User" WHERE email=$1', [
        emails[0],
      ])
    ).rowCount,
  ).toBe(0);
  const code = await mailCode(page.request, emails[0]);
  await page
    .getByLabel("Код из письма")
    .fill(code === "000000" ? "111111" : "000000");
  await page
    .getByRole("button", { name: "Подтвердить почту", exact: true })
    .click();
  await expect(page.locator(".account-form .account-feedback")).toContainText(
    "Код неверный",
  );
  await page.getByLabel("Код из письма").fill(code);
  await page
    .getByRole("button", { name: "Подтвердить почту", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Войти в Kairon" }),
  ).toBeVisible();
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).toHaveURL(/\/study-plan$/);
  await expect(page.locator(".account-nav")).toHaveText("Мой прогресс");
  const meA = await (await page.request.get("/api/me")).json();
  const idA = meA.user.id;
  expect(meA.progress.completedDays).toEqual([]);
  await page.goto("/days/20");
  await page.getByLabel("Я закончил день 20").click();
  await expect(page.getByLabel("Я закончил день 20")).toBeChecked();
  await page.locator(".study-bookmark summary").click();
  await page
    .getByLabel("Моя заметка")
    .fill("Повторить шаг 3. Это заметка первого ученика.");
  await page
    .getByRole("button", { name: "Сохранить место", exact: true })
    .click();
  await expect(
    page.getByText("Закладка и заметка сохранены в аккаунте.", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/public-account-day-mobile.png",
    fullPage: true,
  });

  const otherDevice = await browser.newContext({ baseURL: origin });
  const personB = await browser.newContext({ baseURL: origin });
  try {
    await login(otherDevice, emails[0]);
    const progressA = await (await otherDevice.request.get("/api/me")).json();
    expect(progressA.progress.completedDays).toEqual([20]);
    expect(progressA.progress.bookmark.note).toContain("первого ученика");
    const devicePage = await otherDevice.newPage();
    await devicePage.goto("/study-plan");
    await expect(
      devicePage.getByRole("link", {
        name: "Вернуться к закладке",
        exact: true,
      }),
    ).toHaveAttribute("href", "/days/20");
    await register(personB.request, emails[1]);
    const idB = await login(personB, emails[1]);
    const meB = await (await personB.request.get("/api/me")).json();
    expect(meB.progress).toEqual({
      completedDays: [],
      completedLessonIds: [],
      bookmark: null,
    });
    const forged = await personB.request.post("/api/progress", {
      headers: { Origin: origin },
      data: { action: "day", accountId: idA, day: 20, complete: false },
    });
    expect(forged.status()).toBe(409);
    expect(
      (
        await personB.request.post("/api/progress", {
          headers: { Origin: origin },
          data: { action: "day", accountId: idB, day: 46, complete: true },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await personB.request.post("/api/progress", {
          headers: { Origin: "https://other.example" },
          data: { action: "reset", accountId: idB },
        })
      ).status(),
    ).toBe(403);
    expect(
      (await (await personB.request.get("/api/me")).json()).progress
        .completedDays,
    ).toEqual([46]);
    expect(
      (await (await otherDevice.request.get("/api/me")).json()).progress
        .completedDays,
    ).toEqual([20]);

    // Account progress never overwrites the anonymous browser store.
    expect(
      await page.evaluate(() =>
        localStorage.getItem("kairon-learning-progress-v1"),
      ),
    ).toBeNull();
    await page.evaluate(() =>
      localStorage.setItem(
        "kairon-learning-progress-v1",
        JSON.stringify({ version: 1, completedLessonIds: ["kali-install"] }),
      ),
    );
    await page.goto("/profile");
    await expect(
      page.getByText("Прежние отметки браузера", { exact: true }),
    ).toBeVisible();
    expect(
      (await (await page.request.get("/api/me")).json()).progress
        .completedLessonIds,
    ).toEqual([]);
    await page
      .getByRole("button", { name: "Это мои отметки — перенести" })
      .click();
    await expect(
      page.getByText("Гостевые отметки перенесены в ваш аккаунт.", {
        exact: true,
      }),
    ).toBeVisible();
    expect(
      (await (await page.request.get("/api/me")).json()).progress
        .completedLessonIds,
    ).toEqual(["kali-install"]);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Мой прогресс", exact: true })).toBeVisible();
    await page.screenshot({
      path: "test-results/public-account-profile-desktop.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Выйти из аккаунта" }).click();
    await expect(page.locator(".account-nav")).toHaveText("Войти");
    expect((await (await page.request.get("/api/me")).json()).user).toBeNull();

    // Emulate a different login while an old tab still holds A's identity.
    await login(context, emails[1]);
    const stale = await page.request.post("/api/progress", {
      headers: { Origin: origin },
      data: {
        action: "bookmark",
        accountId: idA,
        day: 1,
        lessonId: null,
        note: "stale account A note",
      },
    });
    expect(stale.status()).toBe(409);
    expect(
      (await (await page.request.get("/api/me")).json()).progress.bookmark,
    ).toBeNull();

    // Advance only this test email's cooldown rather than waiting a minute.
    await owner.query(
      'UPDATE public."LoginAttempt" SET "windowStartedAt"=now()-interval \'61 seconds\' WHERE key=$1',
      [key(`mail-minute:${emails[0]}`)],
    );
    const recovery = await otherDevice.request.post("/api/account", {
      headers: { Origin: origin },
      data: { action: "reset", email: emails[0] },
    });
    expect(recovery.status()).toBe(200);
    const recoveryBody = await recovery.json();
    const recovered = await otherDevice.request.post("/api/account", {
      headers: { Origin: origin },
      data: {
        action: "recover",
        challengeId: recoveryBody.challengeId,
        code: await mailCode(otherDevice.request, emails[0]),
        password: password + "-new",
      },
    });
    expect(recovered.status()).toBe(200);
    expect(
      (await (await otherDevice.request.get("/api/me")).json()).user,
    ).toBeNull();
    await login(otherDevice, emails[0], password + "-new");
    expect(
      (await (await otherDevice.request.get("/api/me")).json()).progress
        .completedDays,
    ).toEqual([20]);
  } finally {
    await otherDevice.close();
    await personB.close();
  }
});
