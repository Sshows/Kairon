import "server-only";
import { HOME, replayCommands } from "./training-terminal";
const localAnswers: Record<string, string[]> = {
  "where-am-i": ["pwd"],
  "hidden-files": ["ls -a", "ls -la", "ls -al", "ls -a -l", "ls -l -a"],
  "move-around": ["cd evidence", "cd ./evidence"],
  "read-evidence": ["001", "1"],
  "find-in-logs": ["3"],
  "create-files": ["mkdir"],
  "write-report": [">"],
  "file-permissions": ["600"],
};
export function checkLesson(
  id: string,
  commands: string[],
  answer: string,
  mode: "browser" | "kali",
): boolean {
  if (id === "permission") return answer === "permission";
  if (id === "network-basics") return answer === "dns";
  if (mode === "kali")
    return (
      localAnswers[id]?.includes(answer.trim().replace(/\s+/g, " ")) ?? false
    );
  const state = replayCommands(commands);
  switch (id) {
    case "where-am-i":
      return state.locations.includes(HOME);
    case "hidden-files":
      return state.listings.some((l) => l.path === HOME && l.hidden);
    case "move-around":
      return (
        state.cwd === `${HOME}/evidence` &&
        state.commands.at(-1)?.trim() === "pwd"
      );
    case "read-evidence":
      return state.reads.includes(`${HOME}/evidence/memo.txt`);
    case "find-in-logs":
      return state.searches.some(
        (s) =>
          s.path === `${HOME}/auth.log` &&
          s.pattern === "Failed password" &&
          s.count === 3,
      );
    case "create-files":
      return (
        state.files[`${HOME}/notes`]?.kind === "dir" &&
        state.files[`${HOME}/notes/findings.txt`]?.kind === "file"
      );
    case "write-report":
      return (
        state.files[`${HOME}/report/count.txt`]?.content.trim() === "3" &&
        state.searches.some(
          (s) =>
            s.path === `${HOME}/auth.log` &&
            s.pattern === "Failed password" &&
            s.count === 3,
        )
      );
    case "file-permissions":
      return state.files[`${HOME}/secrets.txt`]?.mode === "600";
    default:
      return false;
  }
}
