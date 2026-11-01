import { test as base, expect } from "@playwright/test";
import { Client } from "pg";
import { hash } from "bcryptjs";
import { randomUUID, createHmac } from "node:crypto";
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
const origin = "http://localhost:3000";

export const test = base.extend<{
  learner: { id: string; email: string; password: string };
}>({
  learner: [
    async ({ context }, provideLearner) => {
      if (
        process.env.KAIRON_TEST_MAIL !== "1" ||
        process.env.VERCEL ||
        process.env.AUTH_URL !== origin
      )
        throw new Error(
          "Member browser tests require isolated local test configuration.",
        );
      const owner = new Client({ connectionString: process.env.DIRECT_URL });
      await owner.connect();
      const id = randomUUID();
      const email = `member-${id}@example.test`;
      const password = randomUUID() + "-test";
      try {
        await owner.query(
          'INSERT INTO public."User" (id,email,name,"passwordHash","emailVerifiedAt") VALUES ($1,$2,$3,$4,now())',
          [id, email, "Учебный аккаунт", await hash(password, 12)],
        );
        const csrf = await (await context.request.get("/api/auth/csrf")).json();
        await context.request.post("/api/auth/callback/credentials", {
          headers: { "X-Auth-Return-Redirect": "1", Origin: origin },
          form: {
            email,
            password,
            csrfToken: csrf.csrfToken,
            callbackUrl: origin + "/study-plan",
          },
        });
        expect(
          (await (await context.request.get("/api/me")).json()).user?.id,
        ).toBe(id);
        await provideLearner({ id, email, password });
      } finally {
        await owner.query('DELETE FROM public."User" WHERE id=$1', [id]);
        await owner.query('DELETE FROM public."LoginAttempt" WHERE key=$1', [
          createHmac("sha256", process.env.AUTH_SECRET!)
            .update(email)
            .digest("hex"),
        ]);
        await owner.end();
      }
    },
    { auto: true },
  ],
});
export { expect };
