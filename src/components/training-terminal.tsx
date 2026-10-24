"use client";
import { useEffect, useRef, useState } from "react";
import { RotateCcw, Terminal as TerminalIcon } from "lucide-react";
import { executeCommand, newTerminal, HOME } from "@/lib/training-terminal";
export function TrainingTerminal({
  onCommands,
  disabled = false,
}: {
  onCommands?: (commands: string[]) => void;
  disabled?: boolean;
}) {
  const [state, setState] = useState(newTerminal);
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<{ prompt?: string; text: string }[]>([
    {
      text: "Kairon · учебная симуляция Linux\nВведи help для списка команд. Файлы вымышленные. ОС и сеть недоступны.",
    },
  ]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [lines]);
  function run(event: React.FormEvent) {
    event.preventDefault();
    if (!input.trim() || disabled) return;
    const result = executeCommand(state, input);
    setState(result.state);
    onCommands?.(result.state.commands);
    setLines(
      result.clear
        ? []
        : (previous) => [
            ...previous,
            { prompt: state.cwd.replace(HOME, "~"), text: input },
            ...(result.output ? [{ text: result.output }] : []),
          ],
    );
    setInput("");
    setHistoryIndex(null);
  }
  function reset() {
    const fresh = newTerminal();
    setState(fresh);
    onCommands?.([]);
    setLines([
      {
        text: "Учебные файлы восстановлены. Прогресс и XP аккаунта сохранены.",
      },
    ]);
    setInput("");
    setHistoryIndex(null);
    field.current?.focus();
  }
  return (
    <section className="training-terminal" aria-label="Учебный Linux-терминал">
      <div className="terminal-heading">
        <span>
          <TerminalIcon size={16} />
          student@kairon
        </span>
        <span className="terminal-badge">Симуляция Linux</span>
        <button
          type="button"
          onClick={reset}
          disabled={disabled}
          aria-label="Сбросить терминал"
        >
          <RotateCcw size={14} />
          Сбросить
        </button>
      </div>
      <div
        className="terminal-output"
        role="log"
        aria-label="Вывод терминала"
        aria-live="polite"
      >
        {lines.map((line, index) => (
          <div
            key={index}
            className={
              line.prompt !== undefined ? "terminal-command" : "terminal-line"
            }
          >
            {line.prompt !== undefined && (
              <span className="terminal-prompt">{line.prompt} $ </span>
            )}
            {line.text}
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <form onSubmit={run} className="terminal-input-row">
        <label htmlFor="terminal-command" className="terminal-prompt">
          {state.cwd.replace(HOME, "~")} $
        </label>
        <input
          ref={field}
          id="terminal-command"
          aria-label="Команда терминала"
          value={input}
          disabled={disabled}
          maxLength={300}
          onChange={(event) => setInput(event.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          onKeyDown={(event) => {
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
            event.preventDefault();
            const index =
              event.key === "ArrowUp"
                ? Math.max(0, (historyIndex ?? state.commands.length) - 1)
                : Math.min(
                    state.commands.length,
                    (historyIndex ?? state.commands.length) + 1,
                  );
            setHistoryIndex(index);
            setInput(state.commands[index] ?? "");
          }}
        />
        <button type="submit" disabled={disabled || !input.trim()}>
          Выполнить ↵
        </button>
      </form>
      <p className="terminal-caption">
        Одна команда за раз · ↑/↓ история · clear очищает экран · reset
        восстанавливает файлы кнопкой «Сбросить»
      </p>
    </section>
  );
}
