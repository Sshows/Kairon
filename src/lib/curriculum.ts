import type { Locale } from "./i18n";
export type Path = {
  slug: string;
  number: string;
  color: string;
  category: string;
  icon: "terminal" | "target" | "shield" | "tool" | "brain";
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  modules: Record<Locale, string[]>;
  tags: string[];
  availableLessons?: number;
};
export const paths: Path[] = [
  {
    slug: "kali-practice",
    availableLessons: 24,
    number: "08",
    color: "lime",
    category: "beginner",
    icon: "tool",
    title: { ru: "Инструменты Kali на практике", en: "Kali tools in practice" },
    description: {
      ru: "24 урока: от Nmap и OpenSSL до Burp Suite, своего DNS, трафика, метаданных, YARA и проверки путей сайта.",
      en: "24 guides covering network tools, cryptography, HTTP, DNS, traffic, file metadata and local web checks.",
    },
    modules: {
      ru: [
        "Сеть и проверка доступа",
        "Файлы, шифрование и итог",
        "Запросы, DNS и сетевой обмен",
        "Файлы и автоматические проверки",
      ],
      en: [
        "Network and access checks",
        "Files, cryptography and reporting",
        "Requests, DNS and network traffic",
        "Files and automated checks",
      ],
    },
    tags: [
      "Nmap",
      "Netcat",
      "Hydra",
      "Hashcat",
      "OpenSSL",
      "Kali",
      "Burp Suite",
      "YARA",
      "tcpdump",
      "Gobuster",
    ],
  },
  {
    slug: "diagnostics",
    availableLessons: 8,
    number: "07",
    color: "amber",
    category: "beginner",
    icon: "tool",
    title: {
      ru: "Диагностика своего сервиса",
      en: "Troubleshoot your service",
    },
    description: {
      ru: "8 уроков: почему сайт не открывается, что говорят DNS, TLS и журналы, как проверить исправление и передать результат.",
      en: "8 guides: identify a failure, read DNS, TLS and logs, check capacity, verify a fix and report the result.",
    },
    modules: {
      ru: ["Находим слой проблемы", "Проверяем версию и передаём результат"],
      en: [
        "Locate the failing layer",
        "Test a hypothesis and hand over findings",
      ],
    },
    tags: ["Диагностика", "DNS", "TLS", "Журналы", "Troubleshooting"],
  },
  {
    slug: "file-analysis",
    availableLessons: 8,
    number: "06",
    color: "blue",
    category: "defensive",
    icon: "shield",
    title: {
      ru: "Разбор подозрительных файлов",
      en: "Suspicious file analysis",
    },
    description: {
      ru: "8 учебных дел: тип файла, признаки, тревоги, цепочка событий и понятный отчёт. Без запуска неизвестных программ.",
      en: "8 cases: file types, observations, alerts, timelines, and reporting. No unknown programs are executed.",
    },
    modules: {
      ru: ["Проверяем файл без запуска", "Собираем факты и передаём случай"],
      en: ["Inspect without execution", "Correlate events and decide"],
    },
    tags: ["Файлы", "Анализ", "Malware", "DFIR"],
  },
  {
    slug: "security-basics",
    availableLessons: 12,
    number: "05",
    color: "lime",
    category: "beginner",
    icon: "shield",
    title: {
      ru: "Основы безопасности на примерах",
      en: "Security foundations with examples",
    },
    description: {
      ru: "12 уроков: риск, сеть, вход и права, защита приложения, облака и данных ИИ. Сначала смысл, потом действие.",
      en: "12 guides on risk, networking, identity, access, secure development, cloud and AI data.",
    },
    modules: {
      ru: ["Что и зачем защищаем", "Как устроен доступ", "Защита до инцидента"],
      en: [
        "What we protect and why",
        "How access works",
        "Protection before an incident",
      ],
    },
    tags: ["Основы", "Сети", "Доступы", "Foundations"],
  },
  {
    slug: "from-zero",
    availableLessons: 20,
    number: "00",
    color: "lime",
    category: "beginner",
    icon: "terminal",
    title: { ru: "Kali Linux с нуля", en: "Kali Linux from zero" },
    description: {
      ru: "Запусти готовую Kali и пройди 20 понятных уроков: письма, улики, свой сайт и восстановление данных.",
      en: "Set up Kali and follow 20 practical guides: email, evidence, a local website, and data recovery.",
    },
    modules: {
      ru: [
        "Готовая Kali в VirtualBox, снимки и Tor Browser",
        "Подозрительные файлы, письма и следы входа",
        "Локальный сайт, Nmap, HTTP и Wireshark",
        "Процессы, EICAR, резервные копии и отчёт",
      ],
      en: [
        "Ready-made Kali, snapshots, and Tor Browser",
        "Suspicious files, emails, and login traces",
        "Local website, Nmap, HTTP, and Wireshark",
        "Processes, EICAR, backups, and reporting",
      ],
    },
    tags: ["Linux", "Kali", "Сети", "Networks"],
  },
  {
    slug: "red-team",
    number: "01",
    color: "coral",
    category: "offensive",
    icon: "target",
    title: { ru: "Red Team", en: "Red Team" },
    description: {
      ru: "Находи уязвимости, чтобы их исправить. Всё начинается с разведки своей учебной цели.",
      en: "Find weaknesses so they can be fixed. Start by exploring your own training target.",
    },
    modules: {
      ru: [
        "Разведка своей цели с Nmap",
        "Веб-запросы и Burp Suite",
        "Поиск учебных веб-уязвимостей",
        "SQL injection и XSS в песочнице",
        "Пароли и контроль доступа",
        "Сценарий: атака и её следы",
      ],
      en: [
        "Discover your target with Nmap",
        "Web requests and Burp Suite",
        "Finding training web vulnerabilities",
        "SQL injection and XSS in a sandbox",
        "Passwords and access control",
        "Scenario: an attack and its traces",
      ],
    },
    tags: ["Nmap", "Burp Suite", "Web"],
  },
  {
    slug: "blue-team",
    availableLessons: 12,
    number: "02",
    color: "blue",
    category: "defensive",
    icon: "shield",
    title: {
      ru: "Blue Team: безопасность в компании",
      en: "Blue Team: company security",
    },
    description: {
      ru: "12 практических дел: первая смена SOC, доступы, секреты в логах, обновления и передача инцидента.",
      en: "12 practical cases: your first SOC shift, access reviews, leaked secrets, patch priority, and incident handover.",
    },
    modules: {
      ru: [
        "Первая смена: события, тревоги и недостающие логи",
        "Защита компании: обновления, секреты, доступы и копии",
        "Разбор конфигурации SSH, доступ к заказам и финальное дело",
      ],
      en: [
        "First shift: events, alerts, and missing telemetry",
        "Company protection: patches, secrets, access, and backups",
        "SSH review, order authorization, and a final case",
      ],
    },
    tags: ["SOC", "Blue Team", "Доступы", "Логи", "CVSS", "SSH"],
  },
  {
    slug: "kali-tools",
    availableLessons: 8,
    number: "03",
    color: "amber",
    category: "beginner",
    icon: "tool",
    title: { ru: "Свои первые инструменты", en: "Build your first tools" },
    description: {
      ru: "8 уроков с нуля: первая строка Python, отпечатки файлов, Base64, шифр букв, журналы входа и свой отчёт.",
      en: "8 beginner guides: Python, file hashes, Base64, a toy cipher, login logs, and a report.",
    },
    modules: {
      ru: [
        "Первые программы: Python, хеш, Base64 и шифр букв",
        "Проверки: заголовки сайта, записи входов, копии файлов и отчёт",
      ],
      en: [
        "First programs: Python, hashes, Base64, and a toy cipher",
        "Headers, login records, file integrity, and reporting",
      ],
    },
    tags: ["Kali Linux", "Python", "Проекты", "Tools"],
  },
  {
    slug: "ai-data-security",
    number: "04",
    color: "violet",
    category: "ai",
    icon: "brain",
    title: { ru: "Безопасность ИИ и данных", en: "AI & data security" },
    description: {
      ru: "Пойми, как обманывают ИИ, откуда берутся утечки и как разделять данные пользователей.",
      en: "Understand AI manipulation, data leaks, and isolation between users.",
    },
    modules: {
      ru: [
        "Prompt Injection: инструкции внутри данных",
        "Отравление базы знаний RAG",
        "Поиск атак в логах и Sigma",
        "Защита от утечек: DLP",
        "Изоляция клиентов: PostgreSQL RLS",
      ],
      en: [
        "Prompt injection: instructions in data",
        "RAG knowledge poisoning",
        "Finding attacks in logs with Sigma",
        "Data leak prevention: DLP",
        "Tenant isolation: PostgreSQL RLS",
      ],
    },
    tags: ["Ollama", "RAG", "RLS", "DLP"],
  },
];
