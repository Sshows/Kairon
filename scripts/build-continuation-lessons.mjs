import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const catalogue = JSON.parse(read("content/book-courses/catalogue.json"));
const entries = JSON.parse(read("content/continuation/catalogue.json"));
const modules = {
  "security-language": "Инструменты и границы команд",
  automation: "Автоматизация с контролем результата",
  "bug-bounty": "Методика bug bounty",
  cryptography: "Прикладная криптография",
  malware: "Подробный разбор программ",
  "zero-day": "Подробный разбор программ",
};
export function continuationLessons() {
  return entries.map((entry) => {
    const course =
      entry.course && catalogue.courses.find((c) => c.id === entry.course);
    const original = course && course.lessons.find((l) => l.id === entry.id);
    if (entry.course && !original)
      throw new Error(`Missing source lesson: ${entry.id}`);
    const meta = original || entry;
    const check = original?.check || entry;
    const group =
      entry.course ||
      (entry.id.startsWith("auto-")
        ? "automation"
        : entry.id.startsWith("bug-")
          ? "bug-bounty"
          : entry.id.startsWith("crypto-")
            ? "cryptography"
            : "malware");
    const body = read(
      original
        ? `content/book-courses/${entry.course}/${entry.id}.md`
        : `content/continuation/${entry.id}.md`,
    ).trim();
    const prepare = original
      ? ""
      : `## Подготовка: где вводить команды и сохранять код\n\nВсе действия ниже выполняются **внутри своей Kali Linux**. Открой терминал сочетанием Ctrl+Alt+T и выполни по одной строке:\n\n\`\`\`bash\nmkdir -p ~/kairon-study/${entry.id}\ncd ~/kairon-study/${entry.id}\npwd\nmousepad lab.py\n\`\`\`\n\n\`~\` означает твою домашнюю папку. Она раскрывается автоматически: имя пользователя и имя компьютера подставлять не нужно. \`mkdir -p\` создаёт учебную папку, \`cd\` переходит в неё, \`pwd\` показывает реальный путь. Если у тебя другое имя пользователя, начало пути будет отличаться — это нормально. Название \`${entry.id}\` здесь буквальное: мы только что создали такую папку. В Mousepad вставь **Python-код** из практики и нажми Ctrl+S. Команды с пометкой bash вводят в терминал; строки ожидаемого вывода никуда не вставляют. Файл должен называться \`lab.py\`, без дополнительного .txt. После сохранения вернись в тот же терминал.\n\n`;
    const sources = original
      ? `\n\n## Источники и границы материала\n\nТематический ориентир: **${course.book.title}**, ${course.book.authors.join(", ")}. ${course.book.providedScope}\n\n${meta.sources.map((s) => `- ${s.chapter}: ${s.pages}`).join("\n")}\n\nЭто самостоятельный учебный разбор и практика Kairon, а не полный перевод книги. ${course.prerequisites.map((p) => `[Повторить: ${p.label}](${p.href})`).join(" · ")}`
      : "";
    return {
      id: entry.id,
      pathId: entry.pathId,
      title: meta.title,
      module: modules[group],
      level: "Уровень 4",
      minutes: entry.minutes,
      xp: 0,
      summary: meta.summary,
      theory:
        (original ? body : body.replace("<!-- preparation -->", prepare)) +
        sources,
      goal: entry.goal,
      kind: "choice",
      question: check.question,
      answers: [check.answer],
      choices: check.choices,
      checklist: entry.checklist,
      hints: [
        "Вернись к условию опыта: что наблюдалось и какой механизм проверяли?",
        "Сравни варианты с разделом разбора результата; отдели подтверждённое наблюдение от предположения.",
        check.explanation,
      ],
      debrief: check.explanation,
      resources: original
        ? [
            {
              label: course.book.title,
              url: course.book.officialUrl,
              note: meta.sources
                .map((s) => `${s.chapter}: ${s.pages}`)
                .join("; "),
            },
            ...course.prerequisites.map((p) => ({
              label: p.label,
              url: p.href,
              note: "Подготовительный урок основного плана",
            })),
          ]
        : entry.resources,
      kit: false,
      placeholder: "Выбери ответ после практики",
    };
  });
}
const target = new URL("content/lessons/continuation.json", root);
const output = JSON.stringify(continuationLessons(), null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(target, "utf8") !== output)
    throw new Error(
      "Run node scripts/build-continuation-lessons.mjs to sync lesson sources",
    );
} else {
  writeFileSync(fileURLToPath(target), output);
  console.log(
    `Integrated ${entries.length} lessons from their Markdown sources.`,
  );
}
