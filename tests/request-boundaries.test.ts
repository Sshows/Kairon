import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
const currentUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access", () => ({ getCurrentUser: currentUser }));
import { readBoundedText, readAccountInput } from "../src/lib/account-http";
import { POST } from "../src/app/api/learning/[lessonId]/route";
import { safeReturnTo, isPublicRoute } from "../src/lib/access-policy";

function streamed(
  parts: Uint8Array[],
  headers: Record<string, string> = {},
  failCancel = false,
) {
  let reads = 0;
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (reads < parts.length) controller.enqueue(parts[reads++]);
        else controller.close();
      },
      cancel() {
        cancelled = true;
        if (failCancel) throw new Error("cancel failed");
      },
    },
    { highWaterMark: 0 },
  );
  const request = new NextRequest(
    "http://localhost:3000/api/learning/kali-install",
    {
      method: "POST",
      body,
      duplex: "half",
      headers: {
        Origin: "http://localhost:3000",
        "Content-Type": "application/json",
        ...headers,
      },
    } as ConstructorParameters<typeof NextRequest>[1],
  );
  return { request, reads: () => reads, cancelled: () => cancelled };
}
const bytes = (value: string) => new TextEncoder().encode(value);

describe("bounded bodies and learning authorization", () => {
  beforeEach(() => {
    currentUser.mockReset();
    currentUser.mockResolvedValue({ id: "verified" });
  });
  it.each([{} as Record<string, string>, { "Content-Length": "1" }])(
    "stops a lengthless or understated stream at the byte boundary",
    async (headers) => {
      const input = streamed(
        [new Uint8Array(20000), new Uint8Array(20001), new Uint8Array(20000)],
        headers,
        true,
      );
      await expect(readBoundedText(input.request, 40000)).rejects.toMatchObject(
        { status: 413 },
      );
      expect(input.reads()).toBe(2);
      expect(input.cancelled()).toBe(true);
    },
  );
  it("accepts the exact byte limit, counts multibyte characters and keeps the account limit", async () => {
    const exact = "я".repeat(20000);
    expect(await readBoundedText(streamed([bytes(exact)]).request, 40000)).toBe(
      exact,
    );
    await expect(
      readBoundedText(streamed([bytes(exact + "я")]).request, 40000),
    ).rejects.toMatchObject({ status: 413 });
    await expect(
      readAccountInput(
        streamed([bytes('"' + "a".repeat(16000) + '"')]).request,
      ),
    ).rejects.toMatchObject({ status: 413 });
  });
  it("does not read any request body or expose hints without an active account", async () => {
    currentUser.mockResolvedValue(null);
    const input = streamed([bytes('{"action":"hint"}')]);
    const response = await POST(input.request, {
      params: Promise.resolve({ lessonId: "kali-install" }),
    });
    expect(response.status).toBe(401);
    expect(input.reads()).toBe(0);
    expect(await response.json()).not.toHaveProperty("hint");
  });
  it("keeps hints, malformed JSON and oversized JSON behavior for members", async () => {
    const call = (text: string) =>
      POST(streamed([bytes(text)]).request, {
        params: Promise.resolve({ lessonId: "kali-install" }),
      });
    const hint = await call('{"action":"hint"}');
    expect(hint.status).toBe(200);
    expect(await hint.json()).toMatchObject({
      status: "hint",
      guest: false,
      hintsUsed: 1,
    });
    expect((await call("{")).status).toBe(400);
    expect((await call(" ".repeat(40001))).status).toBe(413);
  });
  it("fails closed on a database outage", async () => {
    currentUser.mockRejectedValue(new Error("unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(
        (
          await POST(streamed([bytes("{}")]).request, {
            params: Promise.resolve({ lessonId: "kali-install" }),
          })
        ).status,
      ).toBe(503);
    } finally {
      log.mockRestore();
    }
  });
});

it("allows only explicit public routes and safe local post-login destinations", () => {
  for (const path of [
    "/",
    "/learn/kali-install",
    "/downloads/a.zip",
    "/labs/a.txt",
    "/api/auth/unknown",
    "/login/../learn/a",
  ])
    expect(isPublicRoute(path), path).toBe(false);
  for (const path of [
    "/login",
    "/privacy",
    "/api/auth/csrf",
    "/_next/static/chunk.js",
  ])
    expect(isPublicRoute(path), path).toBe(true);
  for (const path of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/%2f%2fevil.example",
    "/api/account",
    "/login",
  ])
    expect(safeReturnTo(path)).toBe("/study-plan");
  expect(safeReturnTo("/learn/kali-install")).toBe("/learn/kali-install");
});
