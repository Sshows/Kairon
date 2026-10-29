import { describe, expect, it } from "vitest";
import {
  createLocalProgressStore,
  parseStoredProgress,
  PROGRESS_STORAGE_KEY,
} from "../src/lib/local-progress";

const allowed = new Set(["first", "second"]);
function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

describe("account-free progress on this browser", () => {
  it("ignores malformed, oversized and unexpected browser data", () => {
    for (const input of [
      null,
      "{broken",
      "[]",
      "null",
      '{"version":2,"completedLessonIds":["first"]}',
      "x".repeat(50001),
    ])
      expect(parseStoredProgress(input, allowed)).toEqual([]);
    expect(
      parseStoredProgress(
        '{"version":1,"completedLessonIds":["second","first","first","unknown",4,null],"__proto__":{"polluted":true}}',
        allowed,
      ),
    ).toEqual(["first", "second"]);
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });
  it("stores only known completed IDs and restores them after creating a new store", () => {
    const storage = memoryStorage();
    const store = createLocalProgressStore(allowed, () => storage);
    expect(store.getServerSnapshot()).toEqual({
      completedLessonIds: [],
      ready: false,
      storageAvailable: null,
    });
    store.markComplete("unknown");
    expect(storage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
    store.markComplete("first");
    store.markComplete("first");
    expect(JSON.parse(storage.getItem(PROGRESS_STORAGE_KEY)!)).toEqual({
      version: 1,
      completedLessonIds: ["first"],
    });
    const reopened = createLocalProgressStore(allowed, () => storage);
    reopened.refresh();
    expect(reopened.getSnapshot().completedLessonIds).toEqual(["first"]);
    expect(reopened.getServerSnapshot().completedLessonIds).toEqual([]);
  });
  it("merges another tab's recent completion and reacts to a reset", () => {
    const storage = memoryStorage();
    const first = createLocalProgressStore(allowed, () => storage);
    const second = createLocalProgressStore(allowed, () => storage);
    first.markComplete("first");
    second.markComplete("second");
    first.refresh();
    expect(first.getSnapshot().completedLessonIds).toEqual(["first", "second"]);
    second.resetProgress();
    first.refresh();
    expect(first.getSnapshot().completedLessonIds).toEqual([]);
  });
  it("keeps a stable snapshot between updates and works when storage is blocked", () => {
    const store = createLocalProgressStore(allowed, () => {
      throw new Error("Storage disabled");
    });
    let updates = 0;
    const unsubscribe = store.subscribe(() => {
      updates++;
    });
    expect(store.getSnapshot().storageAvailable).toBe(false);
    const initial = store.getSnapshot();
    store.refresh();
    expect(store.getSnapshot()).toBe(initial);
    store.markComplete("first");
    expect(store.getSnapshot().completedLessonIds).toEqual(["first"]);
    expect(store.getSnapshot().storageAvailable).toBe(false);
    store.resetProgress();
    expect(store.getSnapshot().completedLessonIds).toEqual([]);
    expect(updates).toBe(3);
    unsubscribe();
  });
  it("retains a memory completion across subscriptions when reads work but writes fail", () => {
    const storage = memoryStorage();
    const readOnly = {
      ...storage,
      setItem() {
        throw new Error("QuotaExceededError");
      },
    };
    const store = createLocalProgressStore(allowed, () => readOnly);
    store.refresh();
    expect(store.getSnapshot().storageAvailable).toBe(true);
    store.markComplete("first");
    expect(storage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
    const afterFailure = store.getSnapshot();
    const unsubscribe = store.subscribe(() => {});
    store.refresh();
    expect(store.getSnapshot()).toBe(afterFailure);
    expect(store.getSnapshot().completedLessonIds).toEqual(["first"]);
    expect(store.getSnapshot().storageAvailable).toBe(false);
    unsubscribe();
  });
  it("does not resurrect disk results after a failed reset, even when writing later recovers", () => {
    const storage = memoryStorage();
    storage.setItem(
      PROGRESS_STORAGE_KEY,
      '{"version":1,"completedLessonIds":["first"]}',
    );
    let writable = false;
    const restricted = {
      getItem: storage.getItem,
      setItem(key: string, value: string) {
        if (!writable) throw new Error("QuotaExceededError");
        storage.setItem(key, value);
      },
      removeItem() {
        throw new Error("SecurityError");
      },
    };
    const store = createLocalProgressStore(allowed, () => restricted);
    store.refresh();
    expect(store.getSnapshot().completedLessonIds).toEqual(["first"]);
    store.resetProgress();
    const afterReset = store.getSnapshot();
    const unsubscribe = store.subscribe(() => {});
    store.refresh();
    expect(store.getSnapshot()).toBe(afterReset);
    expect(store.getSnapshot().completedLessonIds).toEqual([]);
    expect(store.getSnapshot().storageAvailable).toBe(false);
    store.markComplete("second");
    expect(store.getSnapshot().completedLessonIds).toEqual(["second"]);
    expect(store.getSnapshot().storageAvailable).toBe(false);
    writable = true;
    store.markComplete("second");
    expect(store.getSnapshot().storageAvailable).toBe(true);
    store.refresh();
    expect(store.getSnapshot().completedLessonIds).toEqual(["second"]);
    expect(JSON.parse(storage.getItem(PROGRESS_STORAGE_KEY)!)).toEqual({
      version: 1,
      completedLessonIds: ["second"],
    });
    unsubscribe();
  });
});
