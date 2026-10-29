"use client";

import { useSyncExternalStore } from "react";
import plan from "../../content/day-plan.json";

export const PROGRESS_STORAGE_KEY = "kairon-learning-progress-v1";
const validLessonIds = new Set(plan.days.flatMap((day) => day.lessonIds));

export type LocalProgressSnapshot = {
  completedLessonIds: readonly string[];
  ready: boolean;
  storageAvailable: boolean | null;
};
type ProgressStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const EMPTY_SNAPSHOT: LocalProgressSnapshot = Object.freeze({
  completedLessonIds: Object.freeze([] as string[]),
  ready: false,
  storageAvailable: null,
});

// Browser storage is untrusted input. Never spread its properties into state.
export function parseStoredProgress(
  raw: string | null,
  allowedIds: ReadonlySet<string> = validLessonIds,
): string[] {
  if (!raw || raw.length > 50000) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      !("version" in data) ||
      data.version !== 1 ||
      !("completedLessonIds" in data) ||
      !Array.isArray(data.completedLessonIds)
    )
      return [];
    return [
      ...new Set(
        data.completedLessonIds.filter(
          (id): id is string => typeof id === "string" && allowedIds.has(id),
        ),
      ),
    ].sort();
  } catch {
    return [];
  }
}

export function serializeProgress(ids: readonly string[]) {
  return JSON.stringify({ version: 1, completedLessonIds: [...ids] });
}

/** Small external store; storage failures leave the lesson usable in memory. */
export function createLocalProgressStore(
  allowedIds: ReadonlySet<string>,
  storageProvider: () => ProgressStorage,
) {
  let snapshot = EMPTY_SNAPSHOT;
  // A successful read does not prove that writes work. After a failed mutation,
  // this tab's memory is authoritative until a later mutation can persist it.
  let hasUnsavedChanges = false;
  const listeners = new Set<() => void>();
  function update(ids: readonly string[], storageAvailable: boolean) {
    const next = [...new Set(ids)].filter((id) => allowedIds.has(id)).sort();
    if (
      snapshot.ready &&
      snapshot.storageAvailable === storageAvailable &&
      next.length === snapshot.completedLessonIds.length &&
      next.every((id, index) => id === snapshot.completedLessonIds[index])
    )
      return;
    snapshot = Object.freeze({
      completedLessonIds: Object.freeze(next),
      ready: true,
      storageAvailable,
    });
    for (const listener of listeners) listener();
  }
  function refresh() {
    if (hasUnsavedChanges) {
      update(snapshot.completedLessonIds, false);
      return;
    }
    try {
      const raw = storageProvider().getItem(PROGRESS_STORAGE_KEY);
      update(parseStoredProgress(raw, allowedIds), true);
    } catch {
      update(snapshot.completedLessonIds, false);
    }
  }
  function markComplete(id: string) {
    if (!allowedIds.has(id)) return;
    let ids = snapshot.completedLessonIds;
    try {
      // Merge the current disk value so another tab's recent result survives.
      // A failed reset must not resurrect old IDs from a still-readable disk.
      if (!hasUnsavedChanges)
        ids = [
          ...ids,
          ...parseStoredProgress(
            storageProvider().getItem(PROGRESS_STORAGE_KEY),
            allowedIds,
          ),
        ];
    } catch {
      // Private/restricted browser storage can still keep this tab's result.
    }
    const next = [...new Set([...ids, id])].sort();
    try {
      storageProvider().setItem(PROGRESS_STORAGE_KEY, serializeProgress(next));
      hasUnsavedChanges = false;
      update(next, true);
    } catch {
      hasUnsavedChanges = true;
      update(next, false);
    }
  }
  function resetProgress() {
    try {
      storageProvider().removeItem(PROGRESS_STORAGE_KEY);
      hasUnsavedChanges = false;
      update([], true);
    } catch {
      hasUnsavedChanges = true;
      update([], false);
    }
  }
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => EMPTY_SNAPSHOT,
    subscribe(listener: () => void) {
      listeners.add(listener);
      refresh();
      return () => listeners.delete(listener);
    },
    refresh,
    markComplete,
    resetProgress,
  };
}

const browserStore = createLocalProgressStore(
  validLessonIds,
  () => window.localStorage,
);
function subscribe(listener: () => void) {
  const unsubscribe = browserStore.subscribe(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === PROGRESS_STORAGE_KEY || event.key === null)
      browserStore.refresh();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    unsubscribe();
    window.removeEventListener("storage", onStorage);
  };
}

export function useLocalProgress() {
  const snapshot = useSyncExternalStore(
    subscribe,
    browserStore.getSnapshot,
    browserStore.getServerSnapshot,
  );
  return {
    ...snapshot,
    markComplete: browserStore.markComplete,
    resetProgress: browserStore.resetProgress,
  };
}
