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
function preparation(id) {
  return [
    "## Сделай сейчас: подготовь папку и файл программы",
    "",
    "Все действия ниже выполняются внутри своей Kali Linux. Открой терминал сочетанием Ctrl+Alt+T. Команды с пометкой bash вводят в терминал, Python-код — в файл редактора. Строки ожидаемого вывода нужны для сравнения.",
    "",
    "### Шаг 1. Создай учебную папку",
    "",
    "Введи команду и нажми Enter:",
    "",
    "```bash",
    `mkdir -p ~/kairon-study/${id}`,
    "```",
    "",
    "**Результат:** обычно никакого сообщения. `mkdir` создаёт папку, `-p` разрешает создать промежуточные папки и использовать уже существующую. `~` автоматически выбирает твою домашнюю папку. Имя пользователя или ПК подставлять не нужно.",
    "",
    "### Шаг 2. Перейди в созданную папку",
    "",
    "```bash",
    `cd ~/kairon-study/${id}`,
    "```",
    "",
    `**Результат:** новая строка для следующей команды. Название \`${id}\` здесь буквальное: именно такую папку мы создали на предыдущем шаге.`,
    "",
    "### Шаг 3. Проверь место работы",
    "",
    "```bash",
    "pwd",
    "```",
    "",
    `**Результат:** путь заканчивается на \`/kairon-study/${id}\`. Начало зависит от имени твоего пользователя. Это ответ компьютера, не новая команда.`,
    "",
    "### Шаг 4. Открой файл в редакторе",
    "",
    "```bash",
    "mousepad lab.py",
    "```",
    "",
    "**Результат:** откроется редактор Mousepad. Вставь в него Python-код из раздела практики ниже и нажми Ctrl+S. Файл должен называться `lab.py`, без дополнительного `.txt`. После сохранения закрой окно редактора и вернись в тот же терминал для команды запуска из практики. Если программа просит ввод, следуй указанным там данным.",
    "",
    "",
  ].join("\n");
}
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
        (original
          ? body
          : body.replace("<!-- preparation -->", preparation(entry.id))) +
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
