export type LearningPathId = "from-zero" | "blue-team";

export const learningPaths = [
  {
    id: "from-zero",
    number: "00",
    name: "Kali Linux",
    title: "Kali Linux: от запуска до расследования",
    description:
      "Сначала запустим готовую виртуальную машину. Потом разберём подозрительное письмо, найдём следы входа, проверим свой сайт и восстановим файлы. Всё объясняем с нуля, на простых примерах.",
    startLabel: "Установить и запустить Kali",
    completionLabel: "Курс Kali Linux — путь завершён",
    kit: {
      url: "/downloads/kairon-kali-lab.zip",
      label: "Скачать учебный набор для Kali",
      description:
        "Учебные письма, логи, документы и маленький локальный сайт. Без настоящих вирусов. Распакуй архив в своей Kali.",
      setupLesson: "lab-files",
    },
  },
  {
    id: "blue-team",
    number: "02",
    name: "Безопасность в компании",
    title: "Безопасность в компании: первая смена",
    description:
      "Ты в учебной команде защиты. Поступило подозрительное событие: проверь журналы, отдели ошибку от инцидента, выбери важное исправление и передай понятный отчёт. Все данные вымышлены, практика — в своей Kali.",
    startLabel: "Выйти на первую смену",
    completionLabel: "Безопасность в компании — путь завершён",
    kit: {
      url: "/downloads/kairon-company-lab.zip",
      label: "Скачать набор «Учебная компания»",
      description:
        "Журналы входа, заявки, таблица доступов и копии документов вымышленной компании. Распакуй в домашней папке Kali. Запускать сервер и менять настоящие настройки не нужно.",
      setupLesson: "soc-first-shift",
    },
  },
] as const;

export function getLearningPath(id: string) {
  return learningPaths.find((path) => path.id === id);
}
