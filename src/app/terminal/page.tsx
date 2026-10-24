import Link from "next/link";
import { TrainingTerminal } from "@/components/training-terminal";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Учебный терминал" };
export default function TerminalPage() {
  return (
    <div className="page-container terminal-page">
      <span className="eyebrow">LINUX PLAYGROUND</span>
      <h1>Попробуй команду. Посмотри, что изменилось.</h1>
      <p className="lead">
        Учебная симуляция выполняется в браузере. Здесь есть виртуальные файлы и
        базовые команды Linux. Это не Kali, не подключение к серверу и не доступ
        к реальной сети.
      </p>
      <TrainingTerminal />
      <div className="terminal-tips">
        <code>pwd</code>
        <code>ls -a</code>
        <code>cat rules.txt</code>
        <code>grep &apos;Failed password&apos; auth.log</code>
      </div>
      <Button asChild>
        <Link href="/learn/permission">Начать уроки с заданиями →</Link>
      </Button>
    </div>
  );
}
