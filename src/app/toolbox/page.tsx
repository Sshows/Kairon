import Link from "next/link";
import { toolboxTools } from "@/lib/toolbox";
import { ToolboxIndex } from "@/components/toolbox-index";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Как работают инструменты Kali" };
export default function ToolboxPage() {
  return (
    <div className="page-container document-page library-page toolbox-page">
      <span className="eyebrow">ЗАДАЧА → КОМАНДА → ПОНЯТНЫЙ РЕЗУЛЬТАТ</span>
      <h1>Как работают инструменты Kali</h1>
      <p className="lead">
        Начинаем с вопроса, который нужно проверить. Затем разбираем, что
        инструмент делает с файлом или соединением, зачем нужны его опции и что
        означает вывод.
      </p>
      <section className="tool-course-feature">
        <h2>Попробуй на своём стенде: 24 урока</h2>
        <p>
          Сначала разберём Nmap, Netcat, проверку паролей и OpenSSL. Затем
          перейдём к запросам curl, данным jq, своему DNS, записям трафика, Burp
          Suite, метаданным и правилам YARA. WhatWeb и Gobuster проверят наш
          локальный учебный сервис. Для каждого инструмента объяснены действия и
          вывод.
        </p>
        <div className="course-actions">
          <Button asChild>
            <Link href="/learn/tools-start">Подготовить учебный стенд →</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/paths/kali-practice">Посмотреть программу</Link>
          </Button>
        </div>
      </section>
      <ToolboxIndex
        tools={toolboxTools.map(({ id, name, summary, howItWorks }) => ({
          id,
          name,
          summary,
          howItWorks,
        }))}
      />
      <section className="project-source-note">
        <h2>Материалы LabEx</h2>
        <p>
          В репозитории kali-free-tutorials собраны 36 ссылок на занятия. На
          Kairon подготовлены собственные объяснения и упражнения; на странице
          источника видно, какие темы есть у LabEx и что проверено.
        </p>
        <Link className="subtle-link" href="/sources/labex-kali">
          Все темы и границы проверки →
        </Link>
      </section>
    </div>
  );
}
