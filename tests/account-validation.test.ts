import { describe, it, expect } from "vitest";
import { accountRequestSchema, codeDigest } from "../src/lib/account-codes";
import { progressRequestSchema } from "../src/lib/progress-schema";

describe("account boundary validation", () => {
  it("normalizes email, rejects injected roles and long UTF-8 passwords", () => {
    const registration = {
      action: "register",
      email: " LEARNER@example.test ",
      name: " Learner ",
      password: "my-training-passphrase",
    };
    const parsed = accountRequestSchema.parse(registration);
    expect(parsed).toMatchObject({
      email: "learner@example.test",
      name: "Learner",
    });
    expect(
      accountRequestSchema.safeParse({ ...registration, role: "ADMIN" })
        .success,
    ).toBe(false);
    expect(
      accountRequestSchema.safeParse({
        ...registration,
        password: "я".repeat(37),
      }).success,
    ).toBe(false);
    expect(
      accountRequestSchema.safeParse({
        ...registration,
        email: "A <a@test.test>,b@test.test",
      }).success,
    ).toBe(false);
  });
  it("binds codes to one challenge and does not store the raw code", () => {
    process.env.AUTH_SECRET =
      "test-only-secret-for-code-digest-at-least-32-characters";
    const first = codeDigest("a", "123456");
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toBe(codeDigest("b", "123456"));
    expect(first).not.toBe(codeDigest("a", "654321"));
  });
  it("validates bookmark membership, day limits, note size and strict account fields", () => {
    const data = {
      accountId: "8af17b2d-3d08-466f-9d61-35e480b26c84",
      action: "bookmark",
      day: 1,
      lessonId: "kali-install",
      note: "Next step",
    };
    expect(progressRequestSchema.safeParse(data).success).toBe(true);
    for (const change of [
      { day: 61 },
      { day: 2 },
      { lessonId: "unknown" },
      { note: "x".repeat(1001) },
      { userId: "someone-else" },
    ])
      expect(
        progressRequestSchema.safeParse({ ...data, ...change }).success,
      ).toBe(false);
  });
});
