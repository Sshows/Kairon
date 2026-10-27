export const terms = [
  {
    term: "Алерт / Alert",
    ru: "Сигнал, что правило заметило подозрительное событие. Его нужно проверить; он ещё не доказывает атаку.",
    en: "A signal that a rule detected something suspicious. It needs investigation and does not prove an attack.",
    exampleRu:
      "Пожарная сигнализация могла сработать из-за дыма от тоста. Сначала выясняем причину.",
    exampleEn:
      "A fire alarm may be triggered by burnt toast. Check the cause first.",
  },
  {
    term: "Инцидент / Incident",
    ru: "Событие или ситуация, которая нарушает безопасность либо требует реагирования по правилам организации.",
    en: "An event or situation that compromises security or needs a response under an organization's procedures.",
    exampleRu:
      "Сигнал проверили и обнаружили, что посторонний получил доступ к рабочему аккаунту.",
    exampleEn:
      "An alert was checked and unauthorized access to a work account was found.",
  },
  {
    term: "SIEM",
    ru: "Система, которая собирает события из разных источников и помогает искать связи и создавать сигналы для проверки.",
    en: "A system that collects events from different sources to help find relationships and raise alerts.",
    exampleRu:
      "Общая диспетчерская видит сообщения от нескольких зданий, а не только одной камеры.",
    exampleEn:
      "A shared control room receives signals from multiple buildings.",
  },
  {
    term: "CVSS",
    ru: "Метод описания технической тяжести уязвимости. Один балл не заменяет оценку риска для конкретной компании.",
    en: "A method for describing vulnerability severity. A score alone is not the risk to a specific organization.",
    exampleRu:
      "Одинаковый дефект замка важнее на входе в хранилище, чем на двери пустой кладовки.",
    exampleEn:
      "The same lock defect matters more at a vault entrance than an empty closet.",
  },
  {
    term: "EPSS",
    ru: "Оценка вероятности эксплуатации уязвимости в ближайшие 30 дней по модели FIRST. Не вероятность взлома именно твоей компании.",
    en: "FIRST's estimate of vulnerability exploitation probability over the next 30 days, not the probability of your company being breached.",
    exampleRu:
      "Прогноз помогает расставить очередь проверок, но не предсказывает судьбу отдельного сервера.",
    exampleEn:
      "A forecast helps prioritize reviews, without predicting a particular server's outcome.",
  },
  {
    term: "KEV",
    ru: "Каталог CISA с уязвимостями, эксплуатация которых уже наблюдалась. Полезный сигнал для очереди исправлений.",
    en: "CISA's catalogue of vulnerabilities with observed exploitation, useful for patch prioritization.",
    exampleRu:
      "Есть сведения, что таким дефектом замка уже пользуются, а не только рассуждают о возможности.",
    exampleEn:
      "There is evidence that a lock defect is being used, not just discussed.",
  },
  {
    term: "Минимальные права / Least privilege",
    ru: "Человеку или программе дают только тот доступ, который нужен для согласованной задачи.",
    en: "Give a person or program only the access required for an approved task.",
    exampleRu:
      "Для доставки посылки нужен вход в приёмную, а не ключи от всех кабинетов.",
    exampleEn: "A delivery needs reception access, not keys to every office.",
  },
  {
    term: "Ротация секрета / Secret rotation",
    ru: "Замена ключа или пароля с прекращением действия прежнего. Стереть его из сообщения недостаточно.",
    en: "Replace a key or password and invalidate the previous value. Erasing it from a message is not enough.",
    exampleRu:
      "Потерянный пропуск отключают и выдают новый, а не просто убирают его фотографию из чата.",
    exampleEn:
      "Disable a lost access badge and issue a new one, instead of just deleting its photo.",
  },
  {
    term: "IP",
    ru: "Адрес устройства в сети. По нему устройства находят друг друга.",
    en: "A device address on a network. Devices use it to find each other.",
    exampleRu: "Как адрес дома, только внутри сети.",
    exampleEn: "Like a street address, within a network.",
  },
  {
    term: "Порт / Port",
    ru: "Номер входа к конкретной сетевой службе на устройстве.",
    en: "A numbered endpoint for a particular network service.",
    exampleRu: "IP — дом, порт — дверь в нужную службу.",
    exampleEn: "The IP is a building; the port is a door to a service.",
  },
  {
    term: "DNS",
    ru: "Система, которая помогает найти IP по имени сайта.",
    en: "A system that helps find an IP address from a domain name.",
    exampleRu: "Как телефонная книга: вводишь имя, получаешь адрес.",
    exampleEn: "Like a directory: look up a name to get an address.",
  },
  {
    term: "Brute force",
    ru: "Перебор вариантов, например паролей. На платформе допустим только на своей учебной цели.",
    en: "Trying many candidates, such as passwords. Only permitted against your own training target here.",
    exampleRu: "Проверять по очереди разные учебные коды замка.",
    exampleEn: "Trying a series of codes on a training lock.",
  },
  {
    term: "Фишинг / Phishing",
    ru: "Обманное сообщение, которое пытается заставить человека выдать данные или открыть опасную ссылку.",
    en: "A deceptive message that tries to make someone reveal data or open a harmful link.",
    exampleRu: "Письмо якобы от поддержки с просьбой сообщить пароль.",
    exampleEn: "An email pretending to be support and asking for a password.",
  },
  {
    term: "SQL injection",
    ru: "Ситуация, когда введённый текст меняет смысл запроса к базе. Помогают параметры запроса и ограничения доступа.",
    en: "Input changes the meaning of a database query. Query parameters and access controls help prevent it.",
    exampleRu: "Кассир принял записку покупателя за команду управляющего.",
    exampleEn:
      "A cashier mistakes a customer note for an instruction from the manager.",
  },
  {
    term: "XSS",
    ru: "Уязвимость, из-за которой чужой скрипт выполняется на странице у посетителя.",
    en: "A vulnerability that lets an attacker script run in a visitor's page.",
    exampleRu:
      "В доску объявлений вставили исполняемую инструкцию вместо текста.",
    exampleEn:
      "A notice board displays executable instructions instead of plain text.",
  },
  {
    term: "Payload",
    ru: "Данные или действия, которые доставляет тестовый запрос. Значение зависит от конкретного инструмента.",
    en: "Data or actions delivered by a test request. Its meaning depends on the tool.",
    exampleRu: "Содержимое посылки, которую отправили приложению.",
    exampleEn: "The contents of a package sent to an application.",
  },
  {
    term: "Exploit",
    ru: "Способ использовать конкретную уязвимость. Изучаем его только внутри разрешённого стенда.",
    en: "A way to use a particular vulnerability. We study it only in an authorized lab.",
    exampleRu: "Известный приём открытия неисправного учебного замка.",
    exampleEn: "A known way to open a faulty training lock.",
  },
  {
    term: "Лог / Log",
    ru: "Запись события: что произошло, когда и с каким результатом.",
    en: "A record of an event: what happened, when, and with what outcome.",
    exampleRu: "Журнал посещений на проходной.",
    exampleEn: "A visitor log at a reception desk.",
  },
  {
    term: "SOC",
    ru: "Команда и процессы, которые следят за событиями безопасности и разбирают подозрительное.",
    en: "A team and processes that monitor security events and investigate suspicious activity.",
    exampleRu: "Диспетчерская безопасности организации.",
    exampleEn: "An organization's security control room.",
  },
  {
    term: "Prompt Injection",
    ru: "Попытка выдать недоверенный текст за инструкцию для ИИ.",
    en: "An attempt to make an AI treat untrusted text as instructions.",
    exampleRu: "Вахтёру подложили записку: «Начальник разрешил пропустить».",
    exampleEn: "A guard finds a forged note saying the manager approved entry.",
  },
  {
    term: "RAG",
    ru: "Подход, при котором ИИ сначала находит документы, а затем использует их для ответа.",
    en: "An approach where an AI retrieves documents and uses them to answer.",
    exampleRu: "Консультант сначала заглядывает в справочник.",
    exampleEn: "An adviser checks a reference book before answering.",
  },
  {
    term: "DLP",
    ru: "Меры, которые помогают обнаружить и предотвратить утечку данных.",
    en: "Measures that help detect and prevent data leakage.",
    exampleRu:
      "Проверка посылки перед отправкой: не попали ли туда чужие документы.",
    exampleEn: "Checking a package before sending it for private documents.",
  },
  {
    term: "RLS",
    ru: "Правила PostgreSQL, которые решают, какие строки таблицы доступны текущему контексту пользователя.",
    en: "PostgreSQL policies that decide which table rows a user context may access.",
    exampleRu: "Общий шкаф, где у каждого есть доступ только к своей ячейке.",
    exampleEn:
      "A shared cabinet where each person can access only their own compartment.",
  },
  {
    term: "Breach rate",
    ru: "Доля проверенных попыток, которые нарушили заданное правило. Это результат конкретного набора тестов, а не гарантия для всех атак.",
    en: "The fraction of tested attempts that violated a rule. It describes that test set, not all possible attacks.",
    exampleRu: "Из 10 учебных попыток 2 прошли: 20% на этом наборе.",
    exampleEn:
      "Two out of ten training attempts succeed: 20% on this test set.",
  },
];
