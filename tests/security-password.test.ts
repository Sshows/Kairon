import { describe, it, expect } from "vitest";
import {
  hashPassword,
  isValidPassword,
  verifyPassword,
} from "../src/lib/password";
describe("password boundary", () => {
  it("rejects short and UTF-8 values beyond bcrypt's byte limit", () => {
    expect(isValidPassword("short")).toBe(false);
    expect(isValidPassword("я".repeat(36))).toBe(true);
    expect(isValidPassword("я".repeat(37))).toBe(false);
    expect(isValidPassword("a".repeat(72))).toBe(true);
    expect(isValidPassword("a".repeat(73))).toBe(false);
  });
  it("uses salted hashes and verifies only the matching password", async () => {
    const password = "training-only-unit-password";
    const [a, b] = await Promise.all([
      hashPassword(password),
      hashPassword(password),
    ]);
    expect(a).not.toBe(b);
    expect(a).not.toContain(password);
    expect(await verifyPassword(password, a)).toBe(true);
    expect(await verifyPassword("wrong-training-password", a)).toBe(false);
    expect(await verifyPassword("short", a)).toBe(false);
  });
});
