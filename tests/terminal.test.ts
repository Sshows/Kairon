import { describe, expect, it } from "vitest";
import {
  executeCommand,
  HOME,
  newTerminal,
  replayCommands,
  resolveVirtualPath,
} from "../src/lib/training-terminal";
import { checkLesson } from "../src/lib/lesson-checks";
describe("virtual training terminal", () => {
  it("navigates and reads without changing the previous state", () => {
    const initial = newTerminal();
    const moved = executeCommand(initial, "cd evidence");
    expect(initial.cwd).toBe(HOME);
    expect(moved.state.cwd).toBe(`${HOME}/evidence`);
    expect(executeCommand(moved.state, "cat memo.txt").output).toContain("001");
    expect(resolveVirtualPath(HOME, "../../../../../../")).toBe("/");
  });
  it("handles quoted grep, counts and writing an independent report", () => {
    const commands = [
      "grep -c 'Failed password' auth.log",
      "mkdir report",
      "echo '3' > report/count.txt",
      "cat report/count.txt",
    ];
    expect(executeCommand(newTerminal(), commands[0]).output).toBe("3");
    expect(checkLesson("write-report", commands, "", "browser")).toBe(true);
    expect(newTerminal().files[`${HOME}/report/count.txt`]).toBeUndefined();
  });
  it("rejects shell evaluation, remote tools and unsupported flags", () => {
    for (const command of [
      "echo bad; rm secrets.txt",
      "cat $(whoami)",
      "curl https://example.com",
      "ls --recursive",
      "rm -rf /",
    ]) {
      const result = executeCommand(newTerminal(), command);
      expect(result.state.files[`${HOME}/secrets.txt`]).toBeDefined();
      expect(result.output).toBeTruthy();
    }
    expect(executeCommand(newTerminal(), "echo 'missing").output).toContain(
      "кавычка",
    );
  });
  it("does not accept wrong-directory execution as evidence", () => {
    expect(checkLesson("hidden-files", ["cd /", "ls -a"], "", "browser")).toBe(
      false,
    );
    expect(checkLesson("hidden-files", ["ls -la"], "", "browser")).toBe(true);
    expect(checkLesson("where-am-i", [], "pwd", "browser")).toBe(false);
    expect(checkLesson("where-am-i", [], "pwd", "kali")).toBe(true);
  });
  it("checks virtual results and accepts every authored solution", () => {
    const solutions: Record<string, string[]> = {
      "where-am-i": ["pwd"],
      "hidden-files": ["ls -a"],
      "move-around": ["cd evidence", "pwd"],
      "read-evidence": ["cat evidence/memo.txt"],
      "find-in-logs": ["grep 'Failed password' auth.log"],
      "create-files": ["mkdir notes", "touch notes/findings.txt"],
      "write-report": [
        "grep -c 'Failed password' auth.log",
        "mkdir report",
        "echo '3' > report/count.txt",
      ],
      "file-permissions": ["chmod 600 secrets.txt"],
    };
    for (const [id, commands] of Object.entries(solutions))
      expect(checkLesson(id, commands, "", "browser"), id).toBe(true);
    expect(
      checkLesson(
        "write-report",
        ["mkdir report", "echo 3 > report/count.txt"],
        "",
        "browser",
      ),
    ).toBe(false);
    expect(
      replayCommands(["chmod 600 secrets.txt"]).files[`${HOME}/secrets.txt`]
        .mode,
    ).toBe("600");
  });
});
