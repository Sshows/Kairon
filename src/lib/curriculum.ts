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
    slug: "from-zero",
    availableLessons: 10,
    number: "00",
    color: "lime",
    category: "beginner",
    icon: "terminal",
    title: { ru: "Старт с нуля", en: "Start from zero" },
    description: {
      ru: "Познакомься с Linux, разберись в сетях и сделай первые шаги в терминале.",
      en: "Meet Linux, understand networks, and take your first steps in the terminal.",
    },
    modules: {
      ru: [
        "Этика и разрешение на тестирование",
        "Установка VirtualBox и Kali Linux",
        "Первые команды: ls, cd, cat, grep",
        "Права доступа: chmod и sudo",
        "Сети: IP, порты, DNS, TCP и UDP",
      ],
      en: [
        "Ethics and testing permission",
        "Installing VirtualBox and Kali Linux",
        "First commands: ls, cd, cat, grep",
        "Permissions: chmod and sudo",
        "Networks: IP, ports, DNS, TCP and UDP",
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
    number: "02",
    color: "blue",
    category: "defensive",
    icon: "shield",
    title: { ru: "Blue Team", en: "Blue Team" },
    description: {
      ru: "Замечай подозрительное. Читай логи, исследуй трафик и разбирай инциденты.",
      en: "Spot suspicious activity. Read logs, explore traffic, and investigate incidents.",
    },
    modules: {
      ru: [
        "Твой первый день в SOC",
        "Wireshark и учебный трафик",
        "Логи и признаки атаки",
        "SIEM и Wazuh",
        "Реагирование на инциденты",
        "Основы Active Directory",
      ],
      en: [
        "Your first day in a SOC",
        "Wireshark and training traffic",
        "Logs and signs of an attack",
        "SIEM and Wazuh",
        "Incident response",
        "Active Directory basics",
      ],
    },
    tags: ["SOC", "Wireshark", "Wazuh"],
  },
  {
    slug: "kali-tools",
    number: "03",
    color: "amber",
    category: "beginner",
    icon: "tool",
    title: { ru: "Инструменты Kali", en: "Kali toolkit" },
    description: {
      ru: "Узнай, какой инструмент когда нужен. Понятные примеры вместо списка сложных команд.",
      en: "Learn which tool to use and when. Clear examples instead of long command lists.",
    },
    modules: {
      ru: [
        "Как выбирать инструмент под задачу",
        "Сети и диагностика",
        "Инструменты анализа веба",
        "Анализ файлов и хешей",
        "Справочник безопасной практики",
      ],
      en: [
        "Choosing the right tool",
        "Networks and diagnostics",
        "Web analysis tools",
        "Files and hash analysis",
        "A guide to safe practice",
      ],
    },
    tags: ["Kali Linux", "CLI", "Tools"],
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
