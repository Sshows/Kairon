// Интерпретатор учебных команд. Не вызывает shell, ОС, сеть или eval.
export type VirtualNode = {
  kind: "file" | "dir";
  content: string;
  mode: string;
};
export type TerminalState = {
  cwd: string;
  files: Record<string, VirtualNode>;
  reads: string[];
  locations: string[];
  listings: { path: string; hidden: boolean }[];
  searches: { path: string; pattern: string; count: number }[];
  commands: string[];
};
export const HOME = "/home/student/kairon-lab";
export function newTerminal(): TerminalState {
  const dir = (): VirtualNode => ({ kind: "dir", content: "", mode: "755" });
  const file = (content: string, mode = "644"): VirtualNode => ({
    kind: "file",
    content,
    mode,
  });
  return {
    cwd: HOME,
    reads: [],
    locations: [],
    listings: [],
    searches: [],
    commands: [],
    files: {
      "/": dir(),
      "/home": dir(),
      "/home/student": dir(),
      [HOME]: dir(),
      [`${HOME}/evidence`]: dir(),
      "/var": dir(),
      "/var/log": dir(),
      [`${HOME}/rules.txt`]: file(
        "Учебная среда Kairon.\nРаботаем только с разрешёнными целями.\nРазрешение владельца важнее любопытства.\nРеальные пароли и персональные данные сюда не вводим.\n",
      ),
      [`${HOME}/.welcome`]: file(
        "Ты нашёл скрытый файл. Точка в начале имени скрывает его из обычного ls.\n",
      ),
      [`${HOME}/evidence/memo.txt`]: file(
        "Дело № 001\nИсточник: синтетический учебный набор Kairon.\nПроверь auth.log и запиши наблюдения.\n",
      ),
      [`${HOME}/secrets.txt`]: file(
        "DEMO_KEY=training-data-only\nЭто вымышленные данные, а не действующий секрет.\n",
      ),
      [`${HOME}/auth.log`]: file(
        "Oct 24 10:01:00 training sshd: Failed password for demo from 10.0.0.44\nOct 24 10:01:03 training sshd: Failed password for demo from 10.0.0.44\nOct 24 10:01:07 training sshd: Accepted password for student from 10.0.0.12\nOct 24 10:01:09 training sshd: Failed password for demo from 10.0.0.44\n",
      ),
    },
  };
}
export function resolveVirtualPath(cwd: string, path = HOME): string {
  const input =
    path === "~" ? HOME : path.startsWith("~/") ? HOME + path.slice(1) : path;
  const parts = (input.startsWith("/") ? input : `${cwd}/${input}`).split("/");
  const result: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") result.pop();
    else result.push(part);
  }
  return "/" + result.join("/");
}
function tokenize(input: string): string[] | null {
  const tokens: string[] = [];
  let word = "",
    quote = "",
    started = false;
  for (const char of input) {
    if (quote) {
      if (char === quote) quote = "";
      else word += char;
      started = true;
    } else if (char === '"' || char === "'") {
      quote = char;
      started = true;
    } else if (/\s/.test(char)) {
      if (started) tokens.push(word);
      word = "";
      started = false;
    } else {
      word += char;
      started = true;
    }
  }
  if (quote) return null;
  if (started) tokens.push(word);
  return tokens;
}
function permissions(mode: string) {
  const parts = ["---", "--x", "-w-", "-wx", "r--", "r-x", "rw-", "rwx"];
  return mode
    .split("")
    .map((d) => parts[Number(d)])
    .join("");
}
export function executeCommand(
  previous: TerminalState,
  input: string,
): { state: TerminalState; output: string; clear?: boolean } {
  const state: TerminalState = structuredClone(previous);
  const done = (output: string, clear = false) => ({ state, output, clear });
  if (!input.trim()) return done("");
  if (input.length > 300 || state.commands.length >= 80)
    return done("Лимит учебной сессии. Нажми «Сбросить».");
  state.commands.push(input);
  if (/[|;&`]|\$\(|[\r\n\0]/.test(input))
    return done(
      "В симуляторе выполняй одну команду за раз. Конвейеры и shell-код не поддерживаются.",
    );
  const words = tokenize(input.trim());
  if (!words)
    return done("Не закрыта кавычка. Проверь одинарные или двойные кавычки.");
  const [command, ...args] = words;
  const path = (value?: string) => resolveVirtualPath(state.cwd, value);
  const parent = (value: string) =>
    value.slice(0, value.lastIndexOf("/")) || "/";
  const make = (destination: string, kind: "dir" | "file", content = "") => {
    if (Object.keys(state.files).length >= 80)
      return "Достигнут лимит учебных файлов.";
    if (state.files[parent(destination)]?.kind !== "dir")
      return "Родительской папки нет. Сначала создай её командой mkdir.";
    if (
      Object.values(state.files).reduce((n, f) => n + f.content.length, 0) +
        content.length >
      32000
    )
      return "Достигнут лимит размера учебных файлов.";
    state.files[destination] = {
      kind,
      content,
      mode: kind === "dir" ? "755" : "644",
    };
    return "";
  };
  if (command === "help")
    return done(
      "Учебный Linux-терминал (симуляция).\nhelp, pwd, ls [-a] [-l] [путь], cd [путь], cat файл, grep [-n] [-i] [-c] 'текст' файл\nmkdir папка, touch файл, echo 'текст' [> или >> файл], chmod 600 файл\ncp источник копия, rm файл, whoami, ip a, ss -tuln, clear\nНет доступа к ОС, сети и реальным файлам. Состояние хранится только в этой учебной вкладке.",
    );
  if (command === "clear") return done("", true);
  if (command === "whoami") return done("student");
  if (command === "pwd") {
    state.locations.push(state.cwd);
    return done(state.cwd);
  }
  if (command === "cd") {
    if (args.length > 1) return done("cd: укажи один путь.");
    const destination = path(args[0]);
    if (state.files[destination]?.kind !== "dir")
      return done("cd: такой папки нет.");
    state.cwd = destination;
    return done("");
  }
  if (command === "ls") {
    const flags = args.filter((a) => a.startsWith("-"));
    if (flags.some((f) => !/^-[al]+$/.test(f)))
      return done("ls: доступны только -a и -l.");
    const values = args.filter((a) => !a.startsWith("-"));
    if (values.length > 1) return done("ls: укажи один путь.");
    const destination = path(values[0] ?? state.cwd),
      node = state.files[destination];
    if (!node) return done("ls: путь не найден.");
    const names =
      node.kind === "file"
        ? [destination]
        : Object.keys(state.files).filter(
            (p) => p !== destination && parent(p) === destination,
          );
    const hidden = flags.some((f) => f.includes("a")),
      long = flags.some((f) => f.includes("l"));
    state.listings.push({ path: destination, hidden });
    return done(
      names
        .filter((p) => hidden || !p.split("/").at(-1)!.startsWith("."))
        .sort()
        .map((p) => {
          const f = state.files[p];
          const name = p.split("/").at(-1);
          return long
            ? `${f.kind === "dir" ? "d" : "-"}${permissions(f.mode)} student student ${f.content.length} ${name}`
            : `${name}${f.kind === "dir" ? "/" : ""}`;
        })
        .join("\n"),
    );
  }
  if (command === "cat") {
    if (args.length !== 1) return done("Используй: cat файл");
    const target = path(args[0]),
      file = state.files[target];
    if (file?.kind !== "file") return done("cat: файл не найден.");
    state.reads.push(target);
    return done(file.content.trimEnd());
  }
  if (command === "grep") {
    const options = args.filter((a) => a.startsWith("-"));
    if (options.some((f) => !/^-[nic]+$/.test(f)))
      return done("grep: доступны -n, -i и -c; поиск буквального текста.");
    const values = args.filter((a) => !a.startsWith("-"));
    if (values.length !== 2)
      return done(
        "Используй: grep 'текст' файл. Фразы с пробелами заключай в кавычки.",
      );
    const target = path(values[1]),
      file = state.files[target];
    if (file?.kind !== "file") return done("grep: файл не найден.");
    const insensitive = options.some((f) => f.includes("i")),
      pattern = values[0];
    const lines = file.content
      .trimEnd()
      .split("\n")
      .map((value, index) => ({ value, index }))
      .filter((l) =>
        insensitive
          ? l.value.toLowerCase().includes(pattern.toLowerCase())
          : l.value.includes(pattern),
      );
    state.searches.push({ path: target, pattern, count: lines.length });
    return done(
      options.some((f) => f.includes("c"))
        ? String(lines.length)
        : lines
            .map(
              (l) =>
                `${options.some((f) => f.includes("n")) ? `${l.index + 1}:` : ""}${l.value}`,
            )
            .join("\n"),
    );
  }
  if (command === "mkdir" || command === "touch") {
    if (args.length !== 1 || args[0].startsWith("-"))
      return done(`Используй: ${command} имя`);
    const target = path(args[0]);
    if (state.files[target])
      return done(
        command === "touch" && state.files[target].kind === "file"
          ? ""
          : "Такой путь уже существует.",
      );
    return done(make(target, command === "mkdir" ? "dir" : "file"));
  }
  if (command === "echo") {
    const redirect = args.findIndex((a) => a === ">" || a === ">>");
    if (redirect < 0) return done(args.join(" "));
    if (redirect !== args.length - 2)
      return done(
        "Используй: echo 'текст' > файл (пробелы вокруг > обязательны).",
      );
    const target = path(args[redirect + 1]);
    if (state.files[target]?.kind === "dir")
      return done("echo: путь указывает на папку.");
    const content =
      (args[redirect] === ">>" ? (state.files[target]?.content ?? "") : "") +
      args.slice(0, redirect).join(" ") +
      "\n";
    const oldMode = state.files[target]?.mode;
    const error = make(target, "file", content);
    if (!error && oldMode) state.files[target].mode = oldMode;
    return done(error);
  }
  if (command === "chmod") {
    if (args.length !== 2 || !/^[0-7]{3}$/.test(args[0]))
      return done("Используй: chmod 600 файл (три восьмеричные цифры).");
    const file = state.files[path(args[1])];
    if (!file) return done("chmod: путь не найден.");
    file.mode = args[0];
    return done("");
  }
  if (command === "cp") {
    if (args.length !== 2) return done("Используй: cp файл копия");
    const source = state.files[path(args[0])],
      target = path(args[1]);
    if (source?.kind !== "file" || state.files[target]?.kind === "dir")
      return done("cp: укажи учебный файл и имя копии.");
    return done(make(target, "file", source.content));
  }
  if (command === "rm") {
    if (args.length !== 1 || args[0].startsWith("-"))
      return done(
        "rm: поддерживается удаление одного учебного файла без флагов.",
      );
    const target = path(args[0]);
    if (state.files[target]?.kind !== "file")
      return done("rm: файл не найден.");
    delete state.files[target];
    return done("");
  }
  if (command === "ip" && args[0] === "a")
    return done(
      "[Синтетическая сеть: внешних соединений нет]\n1: lo: inet 127.0.0.1/8\n2: eth0: inet 10.20.0.12/24",
    );
  if (command === "ss" && args[0] === "-tuln")
    return done(
      "[Синтетический пример: портов на сервере не открывает]\nNetid State  Local Address:Port\ntcp   LISTEN 127.0.0.1:8080",
    );
  if (command === "sudo")
    return done(
      "В этой учебной симуляции sudo не нужен. Реальные привилегии не выдаются.",
    );
  return done(
    `${command}: команда не поддерживается. Введи help для списка. Это симуляция, не Kali и не системный shell.`,
  );
}
export function replayCommands(commands: string[]) {
  let state = newTerminal();
  for (const command of commands) state = executeCommand(state, command).state;
  return state;
}
