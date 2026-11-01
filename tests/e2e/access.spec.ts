import { test, expect } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

test("anonymous and forged sessions cannot read pages, RSC, self-checks or files", async ({
  page,
  context,
}) => {
  for (const route of [
    "/",
    "/study-plan",
    "/days/1",
    "/days/60",
    "/learn/kali-install",
    "/profile",
    "/materials",
    "/toolbox",
    "/web-labs",
    "/sources/awesome-hacking",
    "/collections",
    "/glossary",
    "/reading",
    "/reading/malware",
    "/reading/cryptography/aead-tls",
  ]) {
    const response = await page.request.get(route, { maxRedirects: 0 });
    expect(response.status(), route).toBe(307);
    expect(response.headers().location).toContain("/login?next=");
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
  for (const route of [
    "/downloads/kairon-kali-lab.zip",
    "/downloads/kairon-web.json",
    "/labs/kairon-web/practice.py",
    "/images/kali-files.svg",
  ]) {
    expect((await page.request.get(route, { maxRedirects: 0 })).status()).toBe(
      401,
    );
    expect((await page.request.head(route, { maxRedirects: 0 })).status()).toBe(
      401,
    );
  }
  expect(
    (
      await page.request.post("/api/learning/kali-install", {
        headers: { Origin: "http://localhost:3000" },
        data: { action: "hint" },
      })
    ).status(),
  ).toBe(401);
  const rsc = await page.request.get("/learn/kali-install?_rsc=access-check", {
    headers: {
      RSC: "1",
      "Next-Router-Prefetch": "1",
      "x-middleware-subrequest": "proxy:proxy:proxy:proxy:proxy",
    },
    maxRedirects: 0,
  });
  expect(rsc.status()).toBe(307);
  expect(await rsc.text()).not.toContain("Разделы этого урока");
  for (const value of [
    "forged-session",
    await encode({
      token: { sub: "not-a-user" },
      secret: process.env.AUTH_SECRET!,
      salt: "authjs.session-token",
      maxAge: -60,
    }),
  ]) {
    await context.addCookies([
      { name: "authjs.session-token", value, domain: "localhost", path: "/" },
    ]);
    expect(
      (await page.request.get("/days/1", { maxRedirects: 0 })).status(),
    ).toBe(307);
  }
  await context.clearCookies();
  await page.goto("/learn/kali-install");
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(
    page.getByRole("heading", { name: "Войти в Kairon" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Учиться без входа" }),
  ).toHaveCount(0);
  await expect(page.locator(".sidebar")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/public-access-login-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/public-access-login-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await page.request.get("/privacy")).status()).toBe(200);
});
