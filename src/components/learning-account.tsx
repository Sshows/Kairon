"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useLocalProgress } from "@/lib/local-progress";
import {
  emptyAccountProgress,
  type AccountProgress,
} from "@/lib/progress-schema";

type User = { id: string; name: string; email: string };
type Mutation =
  | { action: "lesson"; lessonId: string }
  | { action: "day"; day: number; complete: boolean }
  | { action: "bookmark"; day: number; lessonId: string | null; note: string }
  | { action: "reset" | "clear-bookmark" }
  | { action: "import"; lessonIds: string[] };
type State = {
  status: "loading" | "guest" | "account" | "error";
  user: User | null;
  progress: AccountProgress;
};
type Value = {
  user: User | null;
  status: State["status"];
  ready: boolean;
  storageAvailable: boolean | null;
  completedLessonIds: readonly string[];
  completedDays: number[];
  bookmark: AccountProgress["bookmark"];
  guestLessonIds: readonly string[];
  registrationAvailable: boolean;
  saving: boolean;
  error: string;
  refresh: () => Promise<void>;
  mutate: (data: Mutation) => Promise<boolean>;
  markComplete: (id: string) => Promise<boolean>;
  resetProgress: () => Promise<boolean>;
  importGuest: () => Promise<boolean>;
};
const Context = createContext<Value | null>(null);
const initial: State = {
  status: "loading",
  user: null,
  progress: emptyAccountProgress,
};
const channelName = "kairon-account-events";

export function announceAccountChange() {
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(channelName);
    channel.postMessage("session");
    channel.close();
  }
}

export function reloadAfterAccountChange() {
  announceAccountChange();
  // A full document navigation clears all user-owned React state on sign-in/out.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/study-plan");
}

export function LearningAccountProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const local = useLocalProgress();
  const [state, setState] = useState<State>(initial);
  const stateRef = useRef(state);
  const generation = useRef(0);
  const readSequence = useRef(0);
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [registrationAvailable, setRegistrationAvailable] = useState(false);
  const replace = useCallback((value: State) => {
    stateRef.current = value;
    setState(value);
  }, []);

  const refresh = useCallback(async () => {
    const requestId = ++readSequence.current;
    try {
      const response = await fetch("/api/me", { cache: "no-store" });
      const data = await response.json();
      if (requestId !== readSequence.current) return;
      if (!response.ok)
        throw new Error(
          "Не удалось загрузить аккаунт. Проверьте соединение и повторите.",
        );
      if (stateRef.current.user?.id !== data.user?.id) generation.current++;
      if (stateRef.current.status === "error") setError("");
      replace({
        status: data.user ? "account" : "guest",
        user: data.user,
        progress: data.progress ?? emptyAccountProgress,
      });
      setRegistrationAvailable(data.registrationAvailable === true);
    } catch {
      if (requestId !== readSequence.current) return;
      generation.current++;
      replace({ ...initial, status: "error" });
      setError(
        "Не удалось загрузить аккаунт. Отметки не изменены; попробуйте подключиться снова.",
      );
    }
  }, [replace]);

  useEffect(() => {
    // refresh updates state only after the asynchronous server response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const channel =
      typeof BroadcastChannel === "undefined"
        ? null
        : new BroadcastChannel(channelName);
    const changed = () => {
      generation.current++;
      replace(initial);
      setError("");
      void refresh();
    };
    if (channel)
      channel.onmessage = (event) => {
        if (event.data === "session") changed();
        else void refresh();
      };
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    const invalidateRead = () => {
      readSequence.current++;
    };
    return () => {
      channel?.close();
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
      invalidateRead();
    };
  }, [refresh, replace]);

  const mutate = async (data: Mutation) => {
    const owner = stateRef.current.user;
    if (!owner || stateRef.current.status !== "account" || busy.current)
      return false;
    const version = generation.current;
    busy.current = true;
    setSaving(true);
    setError("");
    // Any read started before this write must not replace its newer result.
    readSequence.current++;
    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, accountId: owner.id }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401 || response.status === 409) {
          generation.current++;
          replace(initial);
          await refresh();
        }
        throw new Error(result.error || "Не удалось сохранить изменения.");
      }
      if (
        version !== generation.current ||
        stateRef.current.user?.id !== owner.id ||
        result.accountId !== owner.id
      )
        return false;
      readSequence.current++;
      replace({ status: "account", user: owner, progress: result.progress });
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel(channelName);
        channel.postMessage("progress");
        channel.close();
      }
      return true;
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Не удалось сохранить. Повторите действие после восстановления соединения.",
      );
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  const guest = state.status === "guest";
  const markComplete = async (id: string) => {
    if ((stateRef.current.user?.id ?? null) !== (state.user?.id ?? null))
      return false;
    if (stateRef.current.status === "guest") {
      local.markComplete(id);
      return true;
    }
    return mutate({ action: "lesson", lessonId: id });
  };
  const resetProgress = async () => {
    if ((stateRef.current.user?.id ?? null) !== (state.user?.id ?? null))
      return false;
    if (stateRef.current.status === "guest") {
      local.resetProgress();
      return true;
    }
    return mutate({ action: "reset" });
  };
  const importGuest = async () => {
    const ok = await mutate({
      action: "import",
      lessonIds: [...local.completedLessonIds],
    });
    if (ok) local.resetProgress();
    return ok;
  };
  return (
    <Context.Provider
      value={{
        user: state.user,
        status: state.status,
        ready: guest ? local.ready : state.status === "account",
        completedLessonIds: guest
          ? local.completedLessonIds
          : state.progress.completedLessonIds,
        completedDays: state.progress.completedDays,
        bookmark: state.progress.bookmark,
        storageAvailable: guest ? local.storageAvailable : null,
        guestLessonIds: local.completedLessonIds,
        registrationAvailable,
        saving,
        error,
        refresh,
        mutate,
        markComplete,
        resetProgress,
        importGuest,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useLearningProgress() {
  const context = useContext(Context);
  if (!context) throw new Error("LearningAccountProvider required");
  return context;
}

export function AccountNav() {
  const { user, status } = useLearningProgress();
  return (
    <Link className="account-nav" href={user ? "/profile" : "/login"}>
      {user ? "Мой прогресс" : status === "loading" ? "Аккаунт" : "Войти"}
    </Link>
  );
}

export function ProgressFeedback() {
  const { error, status, refresh } = useLearningProgress();
  if (!error) return null;
  return (
    <div className="account-feedback" role="alert">
      <p>{error}</p>
      {status === "error" && (
        <button className="subtle-link" onClick={() => void refresh()}>
          Подключиться снова
        </button>
      )}
    </div>
  );
}
