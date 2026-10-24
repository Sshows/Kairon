export const terms = [
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
