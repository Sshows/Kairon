import { beforeEach, describe, expect, it, vi } from "vitest";

const boundaries = vi.hoisted(() => ({
  auth: vi.fn(),
  findSessionUser: vi.fn(),
  getAccountProgress: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  auth: boundaries.auth,
  isAuthConfigured: () => true,
}));
vi.mock("@/lib/db", () => ({
  findSessionUser: boundaries.findSessionUser,
}));
vi.mock("@/lib/account-progress", () => ({
  getAccountProgress: boundaries.getAccountProgress,
}));
vi.mock("@/lib/email", () => ({ isMailConfigured: () => true }));

import { GET } from "../src/app/api/me/route";
import { getCurrentUser } from "../src/lib/access";

const user = {
  id: "80ddcf93-07e5-4e46-83b0-9fb073263462",
  email: "availability@example.test",
  name: "Test learner",
  role: "USER",
  blocked: false,
  sessionVersion: 2,
  emailVerifiedAt: new Date("2026-10-31T00:00:00Z"),
};

describe("account availability is distinct from a guest session", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    boundaries.auth.mockResolvedValue({
      user: { id: user.id, sessionVersion: user.sessionVersion },
    });
    boundaries.findSessionUser.mockResolvedValue(user);
  });

  it("returns 503 for a valid session when Neon is unavailable, without declaring a guest", async () => {
    boundaries.findSessionUser.mockRejectedValue(new Error("database temporarily unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await GET();
      expect(response.status).toBe(503);
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      const body = await response.json();
      expect(body).toHaveProperty("error");
      expect(body).not.toHaveProperty("user");
      expect(body).not.toHaveProperty("progress");
      expect(boundaries.getAccountProgress).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it("rejects an otherwise valid session after its version is revoked", async () => {
    boundaries.findSessionUser.mockResolvedValue({ ...user, sessionVersion: 3 });
    expect(await getCurrentUser()).toBeNull();
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ user: null, progress: null });
    expect(boundaries.getAccountProgress).not.toHaveBeenCalled();
  });
});
